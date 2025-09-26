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
app.use(express.static('./')); // Serve static files from current directory

// Root redirect to launcher
app.get('/', (req, res) => {
    res.redirect('/launcher.html');
});

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

// Queue for failed submissions
const failedSubmissions = [];

// Background retry system - runs every 90 seconds
async function backgroundRetrySystem() {
    if (failedSubmissions.length === 0) {
        return; // No failed submissions to retry
    }

    console.log(`🔄 Background retry: ${failedSubmissions.length} submissions pending...`);

    const toRetry = [...failedSubmissions]; // Copy the array
    failedSubmissions.length = 0; // Clear original array

    for (const submission of toRetry) {
        try {
            console.log(`📝 Retrying: ${submission.data.skill} test for ${submission.data.studentName}`);
            
            const dbClient = await ensureConnection();
            const result = await dbClient.query(`
                INSERT INTO test_submissions
                (student_id, student_name, mock_number, skill, answers, score, band_score, start_time, end_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [submission.data.studentId, submission.data.studentName, submission.data.mockNumber, 
                submission.data.skill, JSON.stringify(submission.data.answers), submission.data.score, 
                submission.data.bandScore, submission.data.startTime, submission.data.endTime]);

            console.log(`✅ Background retry success! ID: ${result.rows[0].id}`);

        } catch (error) {
            console.log(`❌ Background retry failed, will try again in 90s`);
            failedSubmissions.push(submission); // Put it back in queue
        }
    }
}

// Start background retry system (runs every 90 seconds)
setInterval(backgroundRetrySystem, 90000);

// Simple immediate retry function (3 quick attempts)
async function saveWithRetry(data, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📝 Attempt ${attempt}: Saving ${data.skill} test for ${data.studentName}`);
            
            const dbClient = await ensureConnection();
            const result = await dbClient.query(`
                INSERT INTO test_submissions
                (student_id, student_name, mock_number, skill, answers, score, band_score, start_time, end_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [data.studentId, data.studentName, data.mockNumber, data.skill, 
                JSON.stringify(data.answers), data.score, data.bandScore, data.startTime, data.endTime]);

            console.log(`✅ Saved with ID: ${result.rows[0].id}`);
            return result.rows[0].id;

        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                console.log(`🔄 Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
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

// Save test submission
app.post('/submissions', async (req, res) => {
    try {
        const submissionData = req.body;
        const savedId = await saveWithRetry(submissionData);

        res.json({
            success: true,
            message: 'Test submission saved successfully',
            id: savedId
        });

    } catch (error) {
        // Even if immediate save failed, we queued it for background retry
        console.log('⏰ Submission queued for background retry');
        res.json({
            success: true,
            message: 'Test submission queued - will retry until successful',
            queued: true
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

// Mock Answers API endpoints

// GET /mock-answers?mock=1&skill=reading - Get answers for specific mock and skill
app.get('/mock-answers', async (req, res) => {
    try {
        const { mock, skill } = req.query;

        if (!mock || !skill) {
            return res.status(400).json({
                success: false,
                message: 'Mock number and skill are required'
            });
        }

        const dbClient = await ensureConnection();
        const result = await dbClient.query(
            'SELECT * FROM mock_answers WHERE mock_number = $1 AND skill = $2 ORDER BY question_number',
            [parseInt(mock), skill]
        );

        // Convert to the format expected by the frontend
        const answers = {};
        result.rows.forEach(row => {
            const questionKey = skill === 'listening' ? `q${row.question_number}` : `${row.question_number}`;
            
            // Handle alternative answers
            let answerValue = row.correct_answer;
            if (row.alternative_answers && row.alternative_answers.length > 0) {
                answerValue = [row.correct_answer, ...row.alternative_answers];
            }
            
            answers[questionKey] = answerValue;
        });

        console.log(`📚 Retrieved ${result.rows.length} answers for Mock ${mock} - ${skill.toUpperCase()}`);

        res.json({
            success: true,
            answers: answers,
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ Failed to get mock answers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve answers',
            error: error.message
        });
    }
});

// POST /mock-answers - Save answers for specific mock and skill
app.post('/mock-answers', async (req, res) => {
    try {
        const { mock, skill, answers } = req.body;

        if (!mock || !skill || !answers) {
            return res.status(400).json({
                success: false,
                message: 'Mock number, skill, and answers are required'
            });
        }

        const dbClient = await ensureConnection();

        // Begin transaction
        await dbClient.query('BEGIN');

        try {
            // Clear existing answers for this mock/skill combination
            await dbClient.query(
                'DELETE FROM mock_answers WHERE mock_number = $1 AND skill = $2',
                [parseInt(mock), skill]
            );

            // Insert new answers
            let insertedCount = 0;
            for (const [questionKey, answerValue] of Object.entries(answers)) {
                // Extract question number from key (remove 'q' prefix if present)
                const questionNumber = parseInt(questionKey.replace(/^q/, ''));
                
                if (isNaN(questionNumber)) continue;

                let correctAnswer;
                let alternativeAnswers = null;

                if (Array.isArray(answerValue)) {
                    correctAnswer = answerValue[0];
                    if (answerValue.length > 1) {
                        alternativeAnswers = JSON.stringify(answerValue.slice(1));
                    }
                } else {
                    correctAnswer = answerValue;
                }

                await dbClient.query(
                    `INSERT INTO mock_answers 
                     (mock_number, skill, question_number, correct_answer, alternative_answers, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                    [parseInt(mock), skill, questionNumber, correctAnswer, alternativeAnswers]
                );
                
                insertedCount++;
            }

            // Commit transaction
            await dbClient.query('COMMIT');

            console.log(`💾 Saved ${insertedCount} answers for Mock ${mock} - ${skill.toUpperCase()}`);

            res.json({
                success: true,
                message: `Saved ${insertedCount} answers for Mock ${mock} - ${skill.toUpperCase()}`,
                count: insertedCount
            });

        } catch (error) {
            await dbClient.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('❌ Failed to save mock answers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save answers',
            error: error.message
        });
    }
});

// DELETE /mock-answers?mock=1&skill=reading - Delete answers for specific mock and skill
app.delete('/mock-answers', async (req, res) => {
    try {
        const { mock, skill } = req.query;

        if (!mock || !skill) {
            return res.status(400).json({
                success: false,
                message: 'Mock number and skill are required'
            });
        }

        const dbClient = await ensureConnection();
        const result = await dbClient.query(
            'DELETE FROM mock_answers WHERE mock_number = $1 AND skill = $2',
            [parseInt(mock), skill]
        );

        console.log(`🗑️ Deleted ${result.rowCount} answers for Mock ${mock} - ${skill.toUpperCase()}`);

        res.json({
            success: true,
            message: `Deleted ${result.rowCount} answers for Mock ${mock} - ${skill.toUpperCase()}`,
            count: result.rowCount
        });

    } catch (error) {
        console.error('❌ Failed to delete mock answers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete answers',
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