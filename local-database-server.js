// Local server to connect tests directly to Neon database
// Run this with: node local-database-server.js

import { Client } from 'pg';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002; // Using 3002 to avoid conflicts

// Database connection
const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_2yHMSvBcN6rI@ep-old-tooth-agav7q24-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test', async (req, res) => {
    try {
        const result = await client.query('SELECT NOW() as current_time');
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

        const result = await client.query(`
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
        const result = await client.query(`
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

// Initialize and start server
async function startServer() {
    try {
        console.log('🚀 Starting local database server...');

        // Connect to database
        await client.connect();
        console.log('✅ Connected to Neon database');

        // Start server
        app.listen(PORT, () => {
            console.log(`
🎉 Local Database Server running!

📍 Server: http://localhost:${PORT}
🔗 Test connection: http://localhost:${PORT}/test
📊 View submissions: http://localhost:${PORT}/submissions

💡 Your tests will now save to the database automatically!

To test manually:
curl http://localhost:${PORT}/test
            `);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await client.end();
    process.exit(0);
});

// Start the server
startServer();