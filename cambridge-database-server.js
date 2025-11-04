// Cambridge Level Tests Database Server
// Separate server for Cambridge tests - runs on port 3003
// Run this with: node cambridge-database-server.js

import { Client } from 'pg';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3003; // Different port from IELTS server (3002)

// Database connection with auto-reconnect
let client;
let isConnecting = false;

const DATABASE_CONFIG = {
    connectionString: 'postgresql://neondb_owner:npg_4HphojyG2lRn@ep-holy-feather-aggb9nm6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
};

async function createDatabaseConnection() {
    if (isConnecting) {
        return;
    }

    isConnecting = true;

    try {
        if (client) {
            try {
                await client.end();
            } catch (e) {
                // Ignore errors when ending old connection
            }
        }

        client = new Client(DATABASE_CONFIG);

        client.on('error', (err) => {
            console.error('🔄 Database connection lost, will reconnect on next request...', err.message);
            client = null;
        });

        await client.connect();
        console.log('✅ Cambridge Database connected successfully');

        // Initialize Cambridge-specific tables
        await initializeCambridgeTables();

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        client = null;
        throw error;
    } finally {
        isConnecting = false;
    }
}

async function initializeCambridgeTables() {
    try {
        // Create cambridge_submissions table with proper schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS cambridge_submissions (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(100) NOT NULL,
                student_name VARCHAR(200) NOT NULL,
                exam_type VARCHAR(50) DEFAULT 'Cambridge',
                level VARCHAR(50) NOT NULL,
                skill VARCHAR(100) NOT NULL,
                answers JSONB NOT NULL,
                score INTEGER,
                grade VARCHAR(20),
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK (level IN ('A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First')),
                CHECK (skill IN ('reading', 'writing', 'listening', 'reading-writing', 'reading-use-of-english'))
            )
        `);

        // Create indexes for performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cambridge_student_id ON cambridge_submissions(student_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cambridge_level ON cambridge_submissions(level)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cambridge_skill ON cambridge_submissions(skill)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cambridge_created_at ON cambridge_submissions(created_at)
        `);

        console.log('✅ Cambridge tables initialized');
    } catch (error) {
        console.error('❌ Table initialization failed:', error.message);
    }
}

async function ensureConnection() {
    if (!client || client._ending) {
        await createDatabaseConnection();
    }
    return client;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('./')); // Serve static files from current directory

// Root redirect to Cambridge launcher
app.get('/', (req, res) => {
    res.redirect('/Cambridge/launcher-cambridge.html');
});

// Test endpoint
app.get('/test', async (req, res) => {
    try {
        const dbClient = await ensureConnection();
        const result = await dbClient.query('SELECT NOW() as current_time');
        res.json({
            success: true,
            message: 'Cambridge Database connected successfully',
            timestamp: result.rows[0].current_time,
            server: 'Cambridge Database Server'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Queue for failed submissions
const failedSubmissions = [];

// Background retry system - runs every 90 seconds
async function backgroundRetrySystem() {
    if (failedSubmissions.length === 0) {
        return;
    }

    console.log(`🔄 Background retry: ${failedSubmissions.length} Cambridge submissions pending...`);

    const toRetry = [...failedSubmissions];
    failedSubmissions.length = 0;

    for (const submission of toRetry) {
        try {
            console.log(`📝 Retrying: ${submission.data.level} ${submission.data.skill} for ${submission.data.studentName}`);
            
            const dbClient = await ensureConnection();
            const result = await dbClient.query(`
                INSERT INTO cambridge_submissions
                (student_id, student_name, exam_type, level, skill, answers, score, grade, start_time, end_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `, [submission.data.studentId, submission.data.studentName, 'Cambridge',
                submission.data.level, submission.data.skill, JSON.stringify(submission.data.answers), 
                submission.data.score, submission.data.grade, submission.data.startTime, submission.data.endTime]);

            console.log(`✅ Background retry success! ID: ${result.rows[0].id}`);

        } catch (error) {
            console.log(`❌ Background retry failed, will try again in 90s`);
            failedSubmissions.push(submission);
        }
    }
}

// Start background retry system
setInterval(backgroundRetrySystem, 90000);

// Simple immediate retry function
async function saveWithRetry(data, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📝 Attempt ${attempt}: Saving ${data.level} ${data.skill} for ${data.studentName}`);
            
            const dbClient = await ensureConnection();
            const result = await dbClient.query(`
                INSERT INTO cambridge_submissions
                (student_id, student_name, exam_type, level, skill, answers, score, grade, start_time, end_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `, [data.studentId, data.studentName, 'Cambridge', data.level, 
                data.skill, JSON.stringify(data.answers), data.score, data.grade, 
                data.startTime, data.endTime]);

            console.log(`✅ Saved with ID: ${result.rows[0].id}`);
            return result.rows[0].id;

        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                console.log(`🔄 Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    // If all immediate retries failed, add to background queue
    console.log(`📋 Adding to background retry queue (will retry every 90s)`);
    failedSubmissions.push({ 
        data: data, 
        timestamp: new Date().toISOString() 
    });
    
    throw new Error('Immediate save failed - added to background retry queue');
}

// Save Cambridge test submission
app.post('/cambridge-submissions', async (req, res) => {
    try {
        const submissionData = req.body;
        const savedId = await saveWithRetry(submissionData);

        res.json({
            success: true,
            message: 'Cambridge test submission saved successfully',
            id: savedId
        });

    } catch (error) {
        console.log('⏰ Submission queued for background retry');
        res.json({
            success: true,
            message: 'Cambridge test submission queued - will retry until successful',
            queued: true
        });
    }
});

// Get all Cambridge submissions
app.get('/cambridge-submissions', async (req, res) => {
    try {
        const { level, skill } = req.query;
        
        const dbClient = await ensureConnection();
        let query = 'SELECT * FROM cambridge_submissions';
        const params = [];
        const conditions = [];

        if (level) {
            conditions.push(`level = $${params.length + 1}`);
            params.push(level);
        }
        if (skill) {
            conditions.push(`skill = $${params.length + 1}`);
            params.push(skill);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const result = await dbClient.query(query, params);

        res.json({
            success: true,
            submissions: result.rows
        });
    } catch (error) {
        console.error('Failed to fetch submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submissions',
            error: error.message
        });
    }
});

// Update score for a Cambridge submission
app.post('/cambridge-update-score', async (req, res) => {
    try {
        const { submissionId, score, grade } = req.body;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        console.log(`📊 Updating score for Cambridge submission ${submissionId}: ${score}, Grade: ${grade}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            UPDATE cambridge_submissions
            SET score = $1, grade = $2
            WHERE id = $3
            RETURNING id, score, grade
        `, [score, grade, submissionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        console.log(`✅ Score updated for Cambridge submission ${submissionId}`);

        res.json({
            success: true,
            message: 'Score updated successfully',
            submission: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Score update failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update score',
            error: error.message
        });
    }
});

// Get Cambridge answer keys (if you want to add them later)
app.get('/cambridge-answers', async (req, res) => {
    try {
        const { level, skill } = req.query;

        if (!level || !skill) {
            return res.status(400).json({
                success: false,
                message: 'Level and skill are required'
            });
        }

        // This can be implemented later when you add answer keys to the database
        res.json({
            success: true,
            message: 'Cambridge answer keys feature - to be implemented',
            answers: {}
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch answers',
            error: error.message
        });
    }
});

// Initialize database on startup
async function initialize() {
    try {
        await createDatabaseConnection();
        console.log('🚀 Cambridge Database Server starting...');
    } catch (error) {
        console.error('❌ Failed to initialize:', error);
        process.exit(1);
    }
}

// Start server
initialize().then(() => {
    app.listen(PORT, () => {
        console.log('═══════════════════════════════════════════════════');
        console.log('🎓 CAMBRIDGE LEVEL TESTS DATABASE SERVER');
        console.log('═══════════════════════════════════════════════════');
        console.log(`✅ Server running on: http://localhost:${PORT}`);
        console.log(`📊 Database: Cambridge (Neon PostgreSQL)`);
        console.log(`📝 Table: cambridge_submissions`);
        console.log(`🔗 Test connection: http://localhost:${PORT}/test`);
        console.log('═══════════════════════════════════════════════════');
        console.log('\n📚 Supported Levels: A1-Movers, A2-Key, B1-Preliminary, B2-First');
        console.log('📝 Supported Skills: reading, writing, listening, reading-writing, reading-use-of-english');
        console.log('\nPress Ctrl+C to stop the server\n');
    });
}).catch(error => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down Cambridge Database Server...');
    if (client) {
        await client.end();
    }
    process.exit(0);
});
