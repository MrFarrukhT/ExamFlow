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
                mock_test VARCHAR(10) DEFAULT '1',
                skill VARCHAR(100) NOT NULL,
                answers JSONB NOT NULL,
                score INTEGER,
                grade VARCHAR(20),
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                audio_data TEXT,
                audio_size DECIMAL(10,2),
                audio_duration INTEGER,
                audio_mime_type VARCHAR(100),
                evaluated BOOLEAN DEFAULT FALSE,
                evaluator_name VARCHAR(200),
                evaluation_date TIMESTAMP,
                evaluation_notes TEXT,
                CHECK (level IN ('A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First')),
                CHECK (skill IN ('reading', 'writing', 'listening', 'speaking', 'reading-writing', 'reading-use-of-english'))
            )
        `);

        // Add mock_test column if it doesn't exist (for existing databases)
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'mock_test'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN mock_test VARCHAR(10) DEFAULT '1';
                END IF;
            END $$;
        `);

        // Add audio-related columns if they don't exist (for existing databases)
        await client.query(`
            DO $$ 
            BEGIN 
                -- Add audio_data column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'audio_data'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN audio_data TEXT;
                END IF;
                
                -- Add audio_size column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'audio_size'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN audio_size DECIMAL(10,2);
                END IF;
                
                -- Add audio_duration column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'audio_duration'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN audio_duration INTEGER;
                END IF;
                
                -- Add audio_mime_type column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'audio_mime_type'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN audio_mime_type VARCHAR(100);
                END IF;
                
                -- Add evaluated column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'evaluated'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN evaluated BOOLEAN DEFAULT FALSE;
                END IF;
                
                -- Add evaluator_name column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'evaluator_name'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN evaluator_name VARCHAR(200);
                END IF;
                
                -- Add evaluation_date column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'evaluation_date'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN evaluation_date TIMESTAMP;
                END IF;
                
                -- Add evaluation_notes column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'evaluation_notes'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN evaluation_notes TEXT;
                END IF;
            END $$;
        `);

        console.log('✅ Audio columns migration completed');

        // Update the skill check constraint to include 'speaking'
        await client.query(`
            DO $$ 
            BEGIN 
                -- Drop the old constraint if it exists
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'cambridge_submissions_skill_check'
                ) THEN
                    ALTER TABLE cambridge_submissions DROP CONSTRAINT cambridge_submissions_skill_check;
                END IF;
                
                -- Add the new constraint with 'speaking' included
                ALTER TABLE cambridge_submissions 
                ADD CONSTRAINT cambridge_submissions_skill_check 
                CHECK (skill IN ('reading', 'writing', 'listening', 'speaking', 'reading-writing', 'reading-use-of-english'));
            END $$;
        `);

        console.log('✅ Skill constraint updated to include speaking');

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
            CREATE INDEX IF NOT EXISTS idx_cambridge_mock_test ON cambridge_submissions(mock_test)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cambridge_created_at ON cambridge_submissions(created_at)
        `);

        // Create cambridge_answer_keys table for storing correct answers
        await client.query(`
            CREATE TABLE IF NOT EXISTS cambridge_answer_keys (
                id SERIAL PRIMARY KEY,
                level VARCHAR(50) NOT NULL,
                skill VARCHAR(100) NOT NULL,
                mock_test VARCHAR(10) DEFAULT '1',
                answers JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK (level IN ('A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First')),
                CHECK (skill IN ('reading', 'writing', 'listening', 'reading-writing', 'reading-use-of-english')),
                UNIQUE(level, skill, mock_test)
            )
        `);

        // Create indexes for answer keys table
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cambridge_answers_level ON cambridge_answer_keys(level)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cambridge_answers_skill ON cambridge_answer_keys(skill)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cambridge_answers_mock ON cambridge_answer_keys(mock_test)
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
app.use(express.json({ limit: '50mb' })); // Increased limit for audio files
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Also increase URL-encoded limit
app.use(express.static('./')); // Serve static files from current directory

// Root redirect to Cambridge launcher
app.get('/', (req, res) => {
    res.redirect('/Cambridge/launcher-cambridge.html');
});

// Serve Cambridge Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/cambridge-admin-dashboard.html');
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
            console.log(`📝 Retrying: ${submission.data.level} ${submission.data.skill} Mock ${submission.data.mockTest || '1'} for ${submission.data.studentName}`);
            
            const dbClient = await ensureConnection();
            const result = await dbClient.query(`
                INSERT INTO cambridge_submissions
                (student_id, student_name, exam_type, level, mock_test, skill, answers, score, grade, start_time, end_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `, [submission.data.studentId, submission.data.studentName, 'Cambridge',
                submission.data.level, submission.data.mockTest || '1', submission.data.skill, 
                JSON.stringify(submission.data.answers), submission.data.score, 
                submission.data.grade, submission.data.startTime, submission.data.endTime]);

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
            console.log(`📝 Attempt ${attempt}: Saving ${data.level} ${data.skill} Mock ${data.mockTest || '1'} for ${data.studentName}`);
            
            const dbClient = await ensureConnection();
            const result = await dbClient.query(`
                INSERT INTO cambridge_submissions
                (student_id, student_name, exam_type, level, mock_test, skill, answers, score, grade, start_time, end_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `, [data.studentId, data.studentName, 'Cambridge', data.level, 
                data.mockTest || '1', data.skill, JSON.stringify(data.answers), 
                data.score, data.grade, data.startTime, data.endTime]);

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

// Save Cambridge Speaking test submission with audio
app.post('/submit-speaking', async (req, res) => {
    try {
        const { 
            studentId, 
            studentName, 
            level, 
            mockTest, 
            skill,
            audioData, 
            audioSize, 
            duration, 
            mimeType,
            startTime,
            endTime
        } = req.body;

        console.log(`🎤 Saving speaking test: ${level} Mock ${mockTest} for ${studentName} (${audioSize}MB, ${duration}s)`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            INSERT INTO cambridge_submissions
            (student_id, student_name, exam_type, level, mock_test, skill, 
             answers, audio_data, audio_size, audio_duration, audio_mime_type,
             start_time, end_time, evaluated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            studentId, 
            studentName, 
            'Cambridge',
            level, 
            mockTest || '1', 
            skill,
            JSON.stringify({}), // Empty answers object for speaking tests
            audioData,
            audioSize,
            duration,
            mimeType,
            startTime,
            endTime,
            false // Not evaluated yet
        ]);

        console.log(`✅ Speaking test saved with ID: ${result.rows[0].id}`);

        res.json({
            success: true,
            message: 'Speaking test submitted successfully',
            id: result.rows[0].id
        });

    } catch (error) {
        console.error('❌ Speaking submission failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to save speaking test',
            error: error.message
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

        // Return submissions directly as array for admin dashboard
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to fetch submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submissions',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbClient = await ensureConnection();
        await dbClient.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

// Update score for a Cambridge submission (PATCH method for REST compliance)
app.patch('/cambridge-submissions/:id/score', async (req, res) => {
    try {
        const { id } = req.params;
        const { score, grade } = req.body;

        console.log(`📊 Updating score for Cambridge submission ${id}: ${score}, Grade: ${grade || 'N/A'}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            UPDATE cambridge_submissions
            SET score = $1, grade = $2
            WHERE id = $3
            RETURNING *
        `, [score, grade || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        console.log(`✅ Score updated for Cambridge submission ${id}`);

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

// Update speaking test evaluation
app.patch('/cambridge-submissions/:id/evaluate', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            score, 
            grade, 
            evaluatorName, 
            evaluationNotes 
        } = req.body;

        console.log(`🎤 Evaluating speaking test ${id} by ${evaluatorName}: ${score}, Grade: ${grade || 'N/A'}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            UPDATE cambridge_submissions
            SET score = $1, 
                grade = $2, 
                evaluated = TRUE,
                evaluator_name = $3,
                evaluation_date = CURRENT_TIMESTAMP,
                evaluation_notes = $4
            WHERE id = $5
            RETURNING *
        `, [score, grade || null, evaluatorName, evaluationNotes, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Speaking submission not found'
            });
        }

        console.log(`✅ Speaking test ${id} evaluated successfully`);

        res.json({
            success: true,
            message: 'Speaking test evaluated successfully',
            submission: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Evaluation failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to evaluate speaking test',
            error: error.message
        });
    }
});

// Update score for a Cambridge submission (POST method for backwards compatibility)
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

// Get Cambridge answer keys
app.get('/cambridge-answers', async (req, res) => {
    try {
        const { level, skill, mock } = req.query;

        if (!level || !skill) {
            return res.status(400).json({
                success: false,
                message: 'Level and skill are required'
            });
        }

        const dbClient = await ensureConnection();
        
        const mockCondition = mock ? 'AND mock_test = $3' : '';
        const params = mock ? [level, skill, mock] : [level, skill];
        
        const result = await dbClient.query(`
            SELECT answers, mock_test 
            FROM cambridge_answer_keys 
            WHERE level = $1 AND skill = $2 ${mockCondition}
        `, params);

        if (result.rows.length > 0) {
            res.json({
                success: true,
                answers: result.rows[0].answers,
                count: Object.keys(result.rows[0].answers || {}).length,
                mock: result.rows[0].mock_test
            });
        } else {
            res.json({
                success: true,
                answers: {},
                count: 0
            });
        }

    } catch (error) {
        console.error('Failed to fetch Cambridge answers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch answers',
            error: error.message
        });
    }
});

// Save Cambridge answer keys
app.post('/cambridge-answers', async (req, res) => {
    try {
        const { level, skill, mock, answers } = req.body;

        if (!level || !skill || !answers) {
            return res.status(400).json({
                success: false,
                message: 'Level, skill, and answers are required'
            });
        }

        const mockTest = mock || '1';
        console.log(`💾 Saving Cambridge answer key: ${level} ${skill} Mock ${mockTest} (${Object.keys(answers).length} answers)`);

        const dbClient = await ensureConnection();
        
        // Upsert (insert or update)
        const result = await dbClient.query(`
            INSERT INTO cambridge_answer_keys (level, skill, mock_test, answers, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (level, skill, mock_test) 
            DO UPDATE SET answers = $4, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [level, skill, mockTest, JSON.stringify(answers)]);

        console.log(`✅ Cambridge answer key saved: ${level} ${skill} Mock ${mockTest}`);

        res.json({
            success: true,
            message: `Saved ${Object.keys(answers).length} answers for ${level} ${skill} Mock ${mockTest}`,
            answerKey: result.rows[0]
        });

    } catch (error) {
        console.error('Failed to save Cambridge answers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save answers',
            error: error.message
        });
    }
});

// Delete Cambridge answer keys
app.delete('/cambridge-answers', async (req, res) => {
    try {
        const { level, skill, mock } = req.query;

        if (!level || !skill) {
            return res.status(400).json({
                success: false,
                message: 'Level and skill are required'
            });
        }

        const mockTest = mock || '1';
        console.log(`🗑️ Deleting Cambridge answer key: ${level} ${skill} Mock ${mockTest}`);

        const dbClient = await ensureConnection();
        
        const result = await dbClient.query(`
            DELETE FROM cambridge_answer_keys
            WHERE level = $1 AND skill = $2 AND mock_test = $3
            RETURNING *
        `, [level, skill, mockTest]);

        if (result.rows.length > 0) {
            console.log(`✅ Cambridge answer key deleted: ${level} ${skill} Mock ${mockTest}`);
            res.json({
                success: true,
                message: `Deleted answers for ${level} ${skill} Mock ${mockTest}`
            });
        } else {
            res.json({
                success: false,
                message: 'Answer key not found'
            });
        }

    } catch (error) {
        console.error('Failed to delete Cambridge answers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete answers',
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
