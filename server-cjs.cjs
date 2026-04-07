// Local server to connect tests directly to Neon database
// Run this with: node server-cjs.js

const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');
const open = require('open');

// Global Error Handling for Debugging
function logError(error) {
    const errorMsg = `\n[${new Date().toISOString()}] ERROR: ${error.stack || error}\n`;
    try {
        fs.appendFileSync('error.log', errorMsg);
    } catch (e) {
        console.error('Failed to write to error log:', e);
    }
    console.error(errorMsg);
}

process.on('uncaughtException', (error) => {
    logError(error);
    // Keep process alive if possible, or exit gracefully
    // process.exit(1); 
});

process.on('unhandledRejection', (reason, promise) => {
    logError(reason);
});

const app = express();
const PORT = 3002; // Using 3002 to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Licensing Configuration
const LICENSE_FILE = 'license.key';
const SALT = 'INNOVATIVE_CENTRE_SECURE_SALT_2024'; // Secret salt for hash generation

// Helper to get Machine ID
function getMachineId() {
    try {
        return machineIdSync();
    } catch (e) {
        return 'UNKNOWN-MACHINE-ID';
    }
}

// Helper to validate license
function isLicenseValid() {
    try {
        if (!fs.existsSync(LICENSE_FILE)) return false;

        const savedKey = fs.readFileSync(LICENSE_FILE, 'utf8').trim();
        const currentMachineId = getMachineId();

        // Generate expected key: SHA256(MachineID + SALT)
        const expectedKey = crypto.createHash('sha256')
            .update(currentMachineId + SALT)
            .digest('hex')
            .toUpperCase()
            .substring(0, 16)
            .match(/.{1,4}/g)
            .join('-'); // Format: XXXX-XXXX-XXXX-XXXX

        return savedKey === expectedKey;
    } catch (e) {
        return false;
    }
}

// Middleware to enforce license
const checkLicense = (req, res, next) => {
    // Allow license-related endpoints and static assets
    if (req.path === '/license.html' ||
        req.path.startsWith('/api/machine-id') ||
        req.path.startsWith('/api/activate') ||
        req.path.startsWith('/assets') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.js')) {
        return next();
    }

    if (isLicenseValid()) {
        next();
    } else {
        // If it's an API call, return 403
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.status(403).json({ success: false, message: 'License required' });
        } else {
            // If it's a page load, redirect to license page
            res.redirect('/license.html');
        }
    }
};

// Apply license check
app.use(checkLicense);

// License Endpoints
app.get('/api/machine-id', (req, res) => {
    res.json({ machineId: getMachineId() });
});

app.post('/api/activate', (req, res) => {
    const { key } = req.body;
    const currentMachineId = getMachineId();

    const expectedKey = crypto.createHash('sha256')
        .update(currentMachineId + SALT)
        .digest('hex')
        .toUpperCase()
        .substring(0, 16)
        .match(/.{1,4}/g)
        .join('-');

    if (key === expectedKey) {
        fs.writeFileSync(LICENSE_FILE, key);
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

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

// Middleware (Moved to top)
// app.use(cors());
// app.use(express.json());

// Serve static files - handle both local dev and packaged environment
// In pkg, process.pkg is true.
if (process.pkg) {
    // When packaged, we want to serve files from the snapshot
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.static(__dirname));
} else {
    // In development, serve from current directory
    app.use(express.static('./'));
}

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

// ============================================
// CAMBRIDGE TEST SYSTEM ENDPOINTS
// ============================================

// Save Cambridge test submission
app.post('/api/cambridge-submissions', async (req, res) => {
    try {
        const data = req.body;
        console.log(`📝 Cambridge: Saving ${data.module} for ${data.studentName} (${data.level})`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            INSERT INTO cambridge_submissions
            (student_id, student_name, level, module, answers, score, start_time, end_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [data.studentId, data.studentName, data.level, data.module,
        JSON.stringify(data.answers), data.score || 0, data.startTime, data.endTime]);

        console.log(`✅ Cambridge submission saved with ID: ${result.rows[0].id}`);

        res.json({
            success: true,
            message: 'Cambridge test saved successfully',
            id: result.rows[0].id
        });

    } catch (error) {
        console.error('❌ Cambridge save failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save Cambridge submission',
            error: error.message
        });
    }
});

// Get all Cambridge submissions
app.get('/api/cambridge-submissions', async (req, res) => {
    try {
        const { level, module } = req.query;
        let query = 'SELECT * FROM cambridge_submissions';
        const params = [];
        const conditions = [];

        if (level) {
            params.push(level);
            conditions.push(`level = $${params.length}`);
        }
        if (module) {
            params.push(module);
            conditions.push(`module = $${params.length}`);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY submission_time DESC';

        const dbClient = await ensureConnection();
        const result = await dbClient.query(query, params);

        res.json({
            success: true,
            submissions: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Failed to fetch Cambridge submissions:', error);
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

        // Initialize database connection
        await createDatabaseConnection();

        // Start server
        app.listen(PORT, async () => {
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

            // Auto-launch browser
            console.log('🚀 Launching IELTS Test System...');

            // Determine start URL based on license status
            const startUrl = isLicenseValid()
                ? `http://localhost:${PORT}/launcher.html`
                : `http://localhost:${PORT}/license.html`;

            try {
                if (open) {
                    await open(startUrl, {
                        app: {
                            name: open.apps.chrome,
                            arguments: ['--new-window', '--start-fullscreen', '--disable-web-security', '--disable-features=VizDisplayCompositor']
                        }
                    });
                } else {
                    console.log('⚠️ Open module not loaded yet');
                }
            } catch (e) {
                // Fallback to Edge if Chrome fails
                try {
                    if (open) {
                        await open(startUrl, {
                            app: {
                                name: open.apps.edge,
                                arguments: ['--new-window', '--start-fullscreen']
                            }
                        });
                    }
                } catch (e2) {
                    console.log(`⚠️ Could not auto-launch browser. Please open ${startUrl} manually.`);
                }
            }
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
