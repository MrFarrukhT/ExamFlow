// Local server to connect tests directly to Neon database
// Run this with: node local-database-server.js

import { Client } from 'pg';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002; // Using 3002 to avoid conflicts

// Database connection with auto-reconnect
let client;
let isConnecting = false;

const DATABASE_CONFIG = {
    connectionString: 'postgresql://neondb_owner:npg_2yHMSvBcN6rI@ep-old-tooth-agav7q24-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
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
        console.log('✅ Database connected successfully');

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        client = null;
        throw error;
    } finally {
        isConnecting = false;
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

// Test endpoint
app.get('/test', async (req, res) => {
    try {
        const dbClient = await ensureConnection();
        const result = await dbClient.query('SELECT NOW() as current_time');
        res.json({
            success: true,
            message: 'Database connected successfully',
            timestamp: result.rows[0].current_time,
            server: 'Local Database Server'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Save test submission
app.post('/submissions', async (req, res) => {
    try {
        const {
            studentId,
            studentName,
            mockNumber,
            skill,
            answers,
            score,
            bandScore,
            startTime,
            endTime
        } = req.body;

        console.log(`📝 Saving ${skill} test for ${studentName} (${studentId})`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            INSERT INTO test_submissions
            (student_id, student_name, mock_number, skill, answers, score, band_score, start_time, end_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [studentId, studentName, mockNumber, skill, JSON.stringify(answers), score, bandScore, startTime, endTime]);

        console.log(`✅ Saved with ID: ${result.rows[0].id}`);

        res.json({
            success: true,
            message: 'Test submission saved successfully',
            id: result.rows[0].id
        });

    } catch (error) {
        console.error('❌ Database save failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save test submission',
            error: error.message
        });
    }
});

// Get all submissions
app.get('/submissions', async (req, res) => {
    try {
        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            SELECT * FROM test_submissions
            ORDER BY created_at DESC
        `);

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

// Update score for a submission
app.post('/update-score', async (req, res) => {
    try {
        const { submissionId, score, bandScore } = req.body;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        console.log(`📊 Updating score for submission ${submissionId}: ${score}/40, Band: ${bandScore}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            UPDATE test_submissions
            SET score = $1, band_score = $2
            WHERE id = $3
            RETURNING id, score, band_score
        `, [score, bandScore, submissionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        console.log(`✅ Score updated for submission ${submissionId}`);

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

// Initialize and start server
async function startServer() {
    try {
        console.log('🚀 Starting local database server...');

        // Initialize database connection
        await createDatabaseConnection();

        // Start server
        app.listen(PORT, () => {
            console.log(`
🎉 Local Database Server running!

📍 Server: http://localhost:${PORT}
🔗 Test connection: http://localhost:${PORT}/test
📊 View submissions: http://localhost:${PORT}/submissions

💡 Your tests will now save to the database automatically!
🔄 Database connection will auto-recover if lost!

To test manually:
curl http://localhost:${PORT}/test
            `);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.log('⚠️ Server will start anyway, database will connect on first request');

        // Start server even if database connection fails
        app.listen(PORT, () => {
            console.log(`
🎉 Local Database Server running! (Database will connect on first request)

📍 Server: http://localhost:${PORT}
🔗 Test connection: http://localhost:${PORT}/test
📊 View submissions: http://localhost:${PORT}/submissions
            `);
        });
    }
}

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    if (client) {
        try {
            await client.end();
        } catch (e) {
            // Ignore errors during shutdown
        }
    }
    process.exit(0);
});

// Start the server
startServer();