// Cambridge Level Tests Database Server
// Separate server for Cambridge tests - runs on port 3003
// Run this with: node cambridge-database-server.js

import 'dotenv/config';
import path from 'path';
import { createRetryQueue } from './shared/database.js';
import { createServer } from './shared/server-bootstrap.js';

const { app, db, ensureConnection, __dirname: serverDir, start } = createServer({
    port: 3003,
    name: 'Cambridge Database Server',
    callerUrl: import.meta.url,
    dbConfig: {
        connectionString: process.env.CAMBRIDGE_DATABASE_URL || '',
        ssl: { require: true, rejectUnauthorized: false }
    },
    onReady: async ({ port }) => {
        // Initialize Cambridge-specific tables after connection
        const client = await ensureConnection();
        await initializeCambridgeTables(client);

        console.log('═══════════════════════════════════════════════════');
        console.log('🎓 CAMBRIDGE LEVEL TESTS DATABASE SERVER');
        console.log('═══════════════════════════════════════════════════');
        console.log(`✅ Server running on: http://localhost:${port}`);
        console.log(`📊 Database: Cambridge (Neon PostgreSQL)`);
        console.log(`📝 Table: cambridge_submissions`);
        console.log(`🔗 Test connection: http://localhost:${port}/test`);
        console.log('═══════════════════════════════════════════════════');
        console.log('\n📚 Supported Levels: A1-Movers, A2-Key, B1-Preliminary, B2-First');
        console.log('📝 Supported Skills: reading, writing, listening, reading-writing, reading-use-of-english');
        console.log('\nPress Ctrl+C to stop the server\n');
    }
});

// ============================================
// CAMBRIDGE TABLE INITIALIZATION
// ============================================

async function initializeCambridgeTables(client) {
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

// Cambridge submission insert function
async function insertCambridgeSubmission(dbClient, data) {
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
}

const { saveWithRetry } = createRetryQueue(ensureConnection, insertCambridgeSubmission);

// ============================================
// SCORE/GRADE VALIDATION HELPERS
// ============================================

/**
 * Validate a Cambridge score value.
 * Must be an integer between 0 and 200 (Cambridge scale scores go up to 190+).
 * Returns { valid, error } where error is a human-readable message on failure.
 */
function validateScore(score) {
    if (score === null || score === undefined || score === '') {
        return { valid: true }; // score is optional on some endpoints
    }
    const parsed = Number(score);
    if (!Number.isInteger(parsed)) {
        return { valid: false, error: 'Score must be an integer' };
    }
    if (parsed < 0 || parsed > 200) {
        return { valid: false, error: 'Score must be between 0 and 200' };
    }
    return { valid: true, value: parsed };
}

/**
 * Validate a Cambridge grade string.
 * Must be at most 20 characters, containing only alphanumeric chars, spaces, and hyphens.
 * Returns { valid, error }.
 */
function validateGrade(grade) {
    if (grade === null || grade === undefined || grade === '') {
        return { valid: true }; // grade is optional
    }
    if (typeof grade !== 'string') {
        return { valid: false, error: 'Grade must be a string' };
    }
    if (grade.length > 20) {
        return { valid: false, error: 'Grade must be at most 20 characters' };
    }
    if (!/^[a-zA-Z0-9 \-]+$/.test(grade)) {
        return { valid: false, error: 'Grade must contain only letters, numbers, spaces, and hyphens' };
    }
    return { valid: true };
}

/**
 * Validate score and grade together. Returns a 400-style error object or null if valid.
 */
function validateScoreAndGrade(score, grade) {
    const scoreResult = validateScore(score);
    if (!scoreResult.valid) {
        return { success: false, message: scoreResult.error };
    }
    const gradeResult = validateGrade(grade);
    if (!gradeResult.valid) {
        return { success: false, message: gradeResult.error };
    }
    return null; // no error
}

// Valid Cambridge levels and skills for submission validation
const VALID_LEVELS = ['A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First'];
const VALID_SKILLS = ['reading', 'writing', 'listening', 'speaking', 'reading-writing', 'reading-use-of-english'];

/**
 * Strip HTML tags from a string to prevent stored XSS.
 */
function stripHtmlTags(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '');
}

// ============================================
// CAMBRIDGE-SPECIFIC ROUTES
// ============================================

// Root redirect to Cambridge launcher
app.get('/', (req, res) => {
    res.redirect('/Cambridge/launcher-cambridge.html');
});

// Serve Cambridge Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(serverDir, 'cambridge-admin-dashboard.html'));
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

// Save Cambridge test submission
app.post('/cambridge-submissions', async (req, res) => {
    try {
        const submissionData = req.body;

        // Validate required fields (Issue 2: empty/whitespace names, Issue 4: malformed submissions)
        const studentId = typeof submissionData.studentId === 'string' ? submissionData.studentId.trim() : '';
        const studentName = typeof submissionData.studentName === 'string' ? submissionData.studentName.trim() : '';
        if (!studentId || !studentName) {
            return res.status(400).json({ success: false, message: 'Student ID and name are required' });
        }
        if (!submissionData.level || !VALID_LEVELS.includes(submissionData.level)) {
            return res.status(400).json({ success: false, message: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
        }
        if (!submissionData.skill || !VALID_SKILLS.includes(submissionData.skill)) {
            return res.status(400).json({ success: false, message: `Invalid skill. Must be one of: ${VALID_SKILLS.join(', ')}` });
        }
        if (!submissionData.answers) {
            return res.status(400).json({ success: false, message: 'Answers are required' });
        }

        // Validate score and grade if provided
        const validationError = validateScoreAndGrade(submissionData.score, submissionData.grade);
        if (validationError) {
            return res.status(400).json(validationError);
        }

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

        // Validate required fields (Issue 2: empty/whitespace names)
        const trimmedId = typeof studentId === 'string' ? studentId.trim() : '';
        const trimmedName = typeof studentName === 'string' ? studentName.trim() : '';
        if (!trimmedId || !trimmedName) {
            return res.status(400).json({ success: false, message: 'Student ID and name are required' });
        }

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

        // Validate score and grade
        const validationError = validateScoreAndGrade(score, grade);
        if (validationError) {
            return res.status(400).json(validationError);
        }

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

        // Validate score and grade
        const validationError = validateScoreAndGrade(score, grade);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        // Strip HTML tags to prevent stored XSS (Issue 1)
        const sanitizedEvaluatorName = stripHtmlTags(evaluatorName);
        const sanitizedEvaluationNotes = stripHtmlTags(evaluationNotes);

        console.log(`🎤 Evaluating speaking test ${id} by ${sanitizedEvaluatorName}: ${score}, Grade: ${grade || 'N/A'}`);

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
        `, [score, grade || null, sanitizedEvaluatorName, sanitizedEvaluationNotes, id]);

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

        // Validate score and grade
        const validationError = validateScoreAndGrade(score, grade);
        if (validationError) {
            return res.status(400).json(validationError);
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

// =====================================================
// CAMBRIDGE STUDENT RESULTS ENDPOINTS
// =====================================================

// Get all Cambridge student results with optional filters
app.get('/cambridge-student-results', async (req, res) => {
    try {
        let { level, mock_test, search } = req.query;

        // Strip null bytes to prevent UTF-8 encoding errors (Issue 3)
        search = search?.replace(/\0/g, '');

        const dbClient = await ensureConnection();
        let query = 'SELECT * FROM cambridge_student_results';
        const params = [];
        const conditions = [];

        if (level) {
            conditions.push(`level = $${params.length + 1}`);
            params.push(level);
        }
        if (mock_test) {
            conditions.push(`mock_test = $${params.length + 1}`);
            params.push(mock_test);
        }
        if (search) {
            conditions.push(`(student_name ILIKE $${params.length + 1} OR student_id ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const result = await dbClient.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to fetch student results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student results',
            error: error.message
        });
    }
});

// Add new Cambridge student result
app.post('/cambridge-student-results', async (req, res) => {
    try {
        const data = req.body;

        console.log(`📊 Adding student result: ${data.student_name} (${data.student_id}) - ${data.level}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            INSERT INTO cambridge_student_results (
                student_id, student_name, level, mock_test,
                reading_raw, reading_max, reading_scale,
                writing_raw, writing_max, writing_scale,
                listening_raw, listening_max, listening_scale,
                speaking_raw, speaking_max, speaking_scale,
                use_of_english_raw, use_of_english_max, use_of_english_scale,
                reading_writing_raw, reading_writing_max, reading_writing_scale,
                overall_scale, cefr_level,
                shields_listening, shields_reading_writing, shields_speaking, total_shields,
                passed
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7,
                $8, $9, $10,
                $11, $12, $13,
                $14, $15, $16,
                $17, $18, $19,
                $20, $21, $22,
                $23, $24,
                $25, $26, $27, $28,
                $29
            ) RETURNING *
        `, [
            data.student_id, data.student_name, data.level, data.mock_test || '1',
            data.reading_raw, data.reading_max, data.reading_scale,
            data.writing_raw, data.writing_max, data.writing_scale,
            data.listening_raw, data.listening_max, data.listening_scale,
            data.speaking_raw, data.speaking_max, data.speaking_scale,
            data.use_of_english_raw, data.use_of_english_max, data.use_of_english_scale,
            data.reading_writing_raw, data.reading_writing_max, data.reading_writing_scale,
            data.overall_scale, data.cefr_level,
            data.shields_listening, data.shields_reading_writing, data.shields_speaking, data.total_shields,
            data.passed || false
        ]);

        console.log(`✅ Student result added with ID: ${result.rows[0].id}`);

        res.json({
            success: true,
            message: 'Student result added successfully',
            result: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Failed to add student result:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add student result',
            error: error.message
        });
    }
});

// Update Cambridge student result
app.patch('/cambridge-student-results/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        console.log(`📊 Updating student result ID ${id}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            UPDATE cambridge_student_results SET
                student_id = COALESCE($1, student_id),
                student_name = COALESCE($2, student_name),
                level = COALESCE($3, level),
                mock_test = COALESCE($4, mock_test),
                reading_raw = $5,
                reading_max = $6,
                reading_scale = $7,
                writing_raw = $8,
                writing_max = $9,
                writing_scale = $10,
                listening_raw = $11,
                listening_max = $12,
                listening_scale = $13,
                speaking_raw = $14,
                speaking_max = $15,
                speaking_scale = $16,
                use_of_english_raw = $17,
                use_of_english_max = $18,
                use_of_english_scale = $19,
                reading_writing_raw = $20,
                reading_writing_max = $21,
                reading_writing_scale = $22,
                overall_scale = $23,
                cefr_level = $24,
                shields_listening = $25,
                shields_reading_writing = $26,
                shields_speaking = $27,
                total_shields = $28,
                passed = $29,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $30
            RETURNING *
        `, [
            data.student_id, data.student_name, data.level, data.mock_test,
            data.reading_raw, data.reading_max, data.reading_scale,
            data.writing_raw, data.writing_max, data.writing_scale,
            data.listening_raw, data.listening_max, data.listening_scale,
            data.speaking_raw, data.speaking_max, data.speaking_scale,
            data.use_of_english_raw, data.use_of_english_max, data.use_of_english_scale,
            data.reading_writing_raw, data.reading_writing_max, data.reading_writing_scale,
            data.overall_scale, data.cefr_level,
            data.shields_listening, data.shields_reading_writing, data.shields_speaking, data.total_shields,
            data.passed,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student result not found'
            });
        }

        console.log(`✅ Student result ${id} updated successfully`);

        res.json({
            success: true,
            message: 'Student result updated successfully',
            result: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Failed to update student result:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update student result',
            error: error.message
        });
    }
});

// Delete Cambridge student result
app.delete('/cambridge-student-results/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🗑️ Deleting student result ID ${id}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(
            'DELETE FROM cambridge_student_results WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student result not found'
            });
        }

        console.log(`✅ Student result ${id} deleted`);

        res.json({
            success: true,
            message: 'Student result deleted successfully'
        });

    } catch (error) {
        console.error('❌ Failed to delete student result:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete student result',
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

// Start the server
start();
