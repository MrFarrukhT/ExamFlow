// Local server to connect tests directly to Neon database
// Run this with: node local-database-server.js

import 'dotenv/config';
import path from 'path';
import open from 'open';
import OpenAI from 'openai';
import { createRetryQueue } from './shared/database.js';
import { createServer } from './shared/server-bootstrap.js';
import { validateScore } from './shared/validation.js';

// Initialize OpenAI client (will work if API key is configured)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
}) : null;

const { app, ensureConnection, __dirname: serverDir, start } = createServer({
    port: 3002,
    name: 'IELTS Local Database Server',
    callerUrl: import.meta.url,
    dbConfig: {
        connectionString: process.env.DATABASE_URL || '',
        ssl: { require: true, rejectUnauthorized: false }
    },
    onReady: async ({ port }) => {
        // Auto-launch browser
        console.log(`📍 Server: http://localhost:${port}`);
        console.log(`🔗 Test connection: http://localhost:${port}/test`);
        console.log(`📊 View submissions: http://localhost:${port}/submissions`);
        console.log(`\n💡 Your tests will now save to the database automatically!`);
        console.log(`🔄 Database connection will auto-recover if lost!\n`);

        console.log('🚀 Launching IELTS Test System...');
        try {
            await open(`http://localhost:${port}/launcher.html`, {
                app: {
                    name: open.apps.chrome,
                    arguments: ['--new-window', '--start-fullscreen', '--disable-web-security', '--disable-features=VizDisplayCompositor']
                }
            });
        } catch (e) {
            // Fallback to Edge if Chrome fails
            try {
                await open(`http://localhost:${port}/launcher.html`, {
                    app: {
                        name: open.apps.edge,
                        arguments: ['--new-window', '--start-fullscreen']
                    }
                });
            } catch (e2) {
                console.log('⚠️ Could not auto-launch browser. Please open http://localhost:3002/launcher.html manually.');
            }
        }
    }
});

// IELTS submission insert function
async function insertIeltsSubmission(dbClient, data) {
    const result = await dbClient.query(`
        INSERT INTO test_submissions
        (student_id, student_name, mock_number, skill, answers, score, band_score, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
    `, [data.studentId, data.studentName, data.mockNumber, data.skill,
    JSON.stringify(data.answers), data.score, data.bandScore, data.startTime, data.endTime]);
    console.log(`✅ Saved with ID: ${result.rows[0].id}`);
    return result.rows[0].id;
}

const { saveWithRetry } = createRetryQueue(ensureConnection, insertIeltsSubmission);

// ============================================
// IELTS-SPECIFIC ROUTES
// ============================================

// Root redirect to launcher
app.get('/', (req, res) => {
    res.redirect('/launcher.html');
});

// Admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(serverDir, 'ielts-admin-dashboard.html'));
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

// Save test submission
app.post('/submissions', async (req, res) => {
    try {
        const submissionData = req.body;

        // Validate required fields (Issue 4: malformed submissions silently queued)
        const studentId = typeof submissionData.studentId === 'string' ? submissionData.studentId.trim() : '';
        const studentName = typeof submissionData.studentName === 'string' ? submissionData.studentName.trim() : '';
        if (!studentId || !studentName) {
            return res.status(400).json({ success: false, message: 'Student ID and name are required' });
        }
        if (!submissionData.skill) {
            return res.status(400).json({ success: false, message: 'Skill is required' });
        }

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

        // Validate score if provided
        const scoreResult = validateScore(score);
        if (!scoreResult.valid) {
            return res.status(400).json({ success: false, message: scoreResult.error });
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

        // Validate answers is an object with reasonable size
        if (typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > 200) {
            return res.status(400).json({
                success: false,
                message: 'Answers must be an object with at most 200 entries'
            });
        }

        // Validate skill
        const VALID_IELTS_SKILLS = ['reading', 'listening', 'writing', 'speaking'];
        if (!VALID_IELTS_SKILLS.includes(skill)) {
            return res.status(400).json({
                success: false,
                message: `Invalid skill. Must be one of: ${VALID_IELTS_SKILLS.join(', ')}`
            });
        }

        // Strip HTML tags from answer values
        function stripHtml(str) {
            return typeof str === 'string' ? str.replace(/<[^>]*>/g, '') : str;
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
                    correctAnswer = stripHtml(answerValue[0]);
                    if (answerValue.length > 1) {
                        alternativeAnswers = JSON.stringify(answerValue.slice(1).map(stripHtml));
                    }
                } else {
                    correctAnswer = stripHtml(answerValue);
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
// AI SCORING SUGGESTION ENDPOINT
// ============================================

app.post('/api/ai-score-suggestion', async (req, res) => {
    try {
        // Check if OpenAI is configured
        if (!openai) {
            return res.status(503).json({
                success: false,
                message: 'AI scoring not configured. Please add OPENAI_API_KEY to your .env file.'
            });
        }

        const { task1, task2 } = req.body;

        if (!task1 && !task2) {
            return res.status(400).json({
                success: false,
                message: 'At least one task response is required'
            });
        }

        console.log('🤖 Getting AI score suggestion...');

        const prompt = `You are an experienced and fair IELTS writing examiner. Score these writing responses realistically.

=== TASK 1 (Academic Report) ===
${task1 || 'No response provided'}

=== TASK 2 (Essay) ===
${task2 || 'No response provided'}

Score each task (0-9, use .5 increments) based on IELTS Public Band Descriptors:

BAND 7: Good command - handles complex language, occasional inaccuracies
BAND 6: Competent - generally effective, some errors but meaning is clear
BAND 5: Modest - partial command, frequent errors, basic meaning conveyed

For each task, consider:
- Task Achievement/Response (Did they address the topic adequately?)
- Coherence & Cohesion (Is it logically organized?)
- Lexical Resource (Vocabulary range - look for attempts at higher-level words)
- Grammatical Range & Accuracy (Sentence variety, error frequency)

Scoring guidance:
- Most IELTS candidates score between 5.5-7.0
- Give credit for good ideas and attempts at complex vocabulary/structures
- Minor spelling errors shouldn't heavily penalize if meaning is clear
- Word count under minimum (150/250) should reduce score by max 0.5 band
- Calculate overall as: (Task1 + Task2 + Task2) / 3, rounded to nearest 0.5

Respond with ONLY a JSON object:
{"task1Band": 6.0, "task2Band": 6.5, "overallBand": 6.5}`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 100
        });

        const responseText = completion.choices[0].message.content.trim();

        // Parse the JSON response, handling potential markdown code blocks
        let cleanedResponse = responseText;
        if (responseText.includes('```')) {
            cleanedResponse = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }

        const result = JSON.parse(cleanedResponse);

        console.log(`✅ AI suggested scores - Task 1: ${result.task1Band}, Task 2: ${result.task2Band}, Overall: ${result.overallBand}`);

        res.json({
            success: true,
            task1Band: result.task1Band,
            task2Band: result.task2Band,
            overallBand: result.overallBand,
            model: 'gpt-4'
        });

    } catch (error) {
        console.error('❌ AI scoring error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI suggestion',
            error: error.message
        });
    }
});

// Start the server
start();
