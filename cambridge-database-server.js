// Cambridge Level Tests Database Server
// Separate server for Cambridge tests - runs on port 3003
// Run this with: node cambridge-database-server.js

import 'dotenv/config';
import path from 'path';
import { createRetryQueue } from './shared/database.js';
import { createServer } from './shared/server-bootstrap.js';
import { validateScoreAndGrade, validateStudentInfo, stripHtmlTags, sanitizeAntiCheat } from './shared/validation.js';
import { requireAdmin, rateLimit } from './shared/auth.js';

const { app, db, ensureConnection, __dirname: serverDir, start } = createServer({
    port: 3003,
    name: 'Cambridge Database Server',
    callerUrl: import.meta.url,
    dbConfig: {
        connectionString: process.env.CAMBRIDGE_DATABASE_URL || '',
        ssl: { require: true, rejectUnauthorized: false }
    },
    staticOptions: { index: false },
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
        console.log('\n📚 Supported Levels: A1-Movers, A2-Key, B1-Preliminary, B2-First, C1-Advanced');
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
                CHECK (level IN ('A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First', 'C1-Advanced')),
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

        // Add anti_cheat_data JSONB column for invigilator visibility into violations
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'cambridge_submissions' AND column_name = 'anti_cheat_data'
                ) THEN
                    ALTER TABLE cambridge_submissions ADD COLUMN anti_cheat_data JSONB;
                END IF;
            END $$;
        `);
        console.log('✅ anti_cheat_data column ready');

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

        // Update level constraint to include C1-Advanced (Olympiada launch)
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'cambridge_submissions_level_check'
                ) THEN
                    ALTER TABLE cambridge_submissions DROP CONSTRAINT cambridge_submissions_level_check;
                END IF;

                ALTER TABLE cambridge_submissions
                ADD CONSTRAINT cambridge_submissions_level_check
                CHECK (level IN ('A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First', 'C1-Advanced'));
            END $$;
        `);
        console.log('✅ Level constraint updated to include C1-Advanced');

        // Update answer-keys level constraint too
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'cambridge_answer_keys_level_check'
                ) THEN
                    ALTER TABLE cambridge_answer_keys DROP CONSTRAINT cambridge_answer_keys_level_check;
                END IF;

                -- Only add if the table exists (skip on first run before table creation below)
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'cambridge_answer_keys'
                ) THEN
                    ALTER TABLE cambridge_answer_keys
                    ADD CONSTRAINT cambridge_answer_keys_level_check
                    CHECK (level IN ('A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First', 'C1-Advanced'));
                END IF;
            END $$;
        `);
        console.log('✅ Answer-keys level constraint updated to include C1-Advanced');

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
                CHECK (level IN ('A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First', 'C1-Advanced')),
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
    // Sanitize client anti-cheat metadata: strips HTML, caps size (4KB), depth, key count.
    // Removes server-managed keys so the client can't forge them.
    const SERVER_AC_KEYS = ['durationFlag'];
    const cleanAC = sanitizeAntiCheat(data.antiCheat, SERVER_AC_KEYS) || {};
    if (data.durationFlag) cleanAC.durationFlag = true;
    const antiCheatJson = Object.keys(cleanAC).length > 0 ? JSON.stringify(cleanAC) : null;

    // Honor client-supplied examType (Olympiada vs Cambridge) instead of hardcoding.
    // Strict string check first — prevents single-element-array bypass via toString().
    const examTypeRaw = (typeof data.examType === 'string') ? data.examType.slice(0, 50) : 'Cambridge';
    const examType = ['Cambridge', 'Olympiada'].includes(examTypeRaw) ? examTypeRaw : 'Cambridge';

    const result = await dbClient.query(`
        INSERT INTO cambridge_submissions
        (student_id, student_name, exam_type, level, mock_test, skill, answers, score, grade, start_time, end_time, anti_cheat_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
    `, [data.studentId, data.studentName, examType, data.level,
        data.mockTest || '1', data.skill, JSON.stringify(data.answers),
        data.score, data.grade, data.startTime, data.endTime, antiCheatJson]);
    console.log(`✅ Saved with ID: ${result.rows[0].id}${antiCheatJson ? ' (with anti-cheat flags)' : ''}`);
    return result.rows[0].id;
}

const { saveWithRetry } = createRetryQueue(ensureConnection, insertCambridgeSubmission);

// Valid Cambridge levels and skills for submission validation
// C1-Advanced added for Zarmet University Olympiada (uses Cambridge dashboard infrastructure)
const VALID_LEVELS = ['A1-Movers', 'A2-Key', 'B1-Preliminary', 'B2-First', 'C1-Advanced'];
const VALID_SKILLS = ['reading', 'writing', 'listening', 'speaking', 'reading-writing', 'reading-use-of-english'];

// Rate limit on student-facing submission endpoints
const submissionLimiter = rateLimit({ windowMs: 60000, maxRequests: 10, message: 'Too many submissions. Try again later.' });

// In-memory dedup lock — prevents concurrent submissions for same student+level+skill+mock
const submissionLocks = new Set();

// Cambridge time limits per level (minutes) — used for duration validation
const CAMBRIDGE_TIME_LIMITS = {
    'A1-Movers': { reading: 50, writing: 50, listening: 30, speaking: 15, 'reading-writing': 60 },
    'A2-Key': { reading: 60, writing: 60, listening: 30, speaking: 15, 'reading-writing': 60, 'reading-use-of-english': 60 },
    'B1-Preliminary': { reading: 60, writing: 60, listening: 35, speaking: 15, 'reading-writing': 90, 'reading-use-of-english': 60 },
    'B2-First': { reading: 75, writing: 80, listening: 40, speaking: 15, 'reading-use-of-english': 75 },
    'C1-Advanced': { reading: 90, writing: 90, listening: 40, speaking: 15, 'reading-use-of-english': 90 }
};

// ============================================
// CAMBRIDGE-SPECIFIC ROUTES
// ============================================

// Root redirect to Cambridge launcher
app.get('/', (req, res) => {
    res.redirect('/launcher.html?exam=cambridge');
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
        console.error('Database connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }
});

// ============================================
// STUDENT-FACING ENDPOINTS (no admin auth)
// ============================================

// Get a student's own submissions (no audio data, scoped by student_id+student_name).
// Security: requires BOTH student_id AND student_name to match a real submission.
// This raises the bar for impersonation — a student would need to know both fields
// to read another student's data.
app.get('/my-submissions', submissionLimiter, async (req, res) => {
    try {
        const { student_id, student_name, level, mock_test } = req.query;
        if (!student_id || !student_name) {
            return res.status(400).json({ success: false, message: 'student_id and student_name are required' });
        }
        // Fail-fast on invalid level enum to prevent silent empty results
        if (level && !VALID_LEVELS.includes(level)) {
            return res.status(400).json({ success: false, message: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
        }

        const dbClient = await ensureConnection();

        // Verify the student_id+student_name combo matches a real submission.
        // Returns empty submissions array if no match — same as no submissions yet.
        const identityCheck = await dbClient.query(
            `SELECT 1 FROM cambridge_submissions WHERE student_id = $1 AND student_name = $2 LIMIT 1`,
            [String(student_id), String(student_name)]
        );
        if (identityCheck.rows.length === 0) {
            return res.json({ success: true, submissions: [] });
        }

        const conditions = ['student_id = $1', 'student_name = $2'];
        const params = [String(student_id), String(student_name)];

        if (level) {
            conditions.push(`level = $${params.length + 1}`);
            params.push(level);
        }
        if (mock_test) {
            conditions.push(`mock_test = $${params.length + 1}`);
            params.push(String(mock_test));
        }

        const query = `SELECT id, student_id, student_name, level, mock_test, skill, answers, score, grade,
                               start_time, end_time, created_at, evaluated, evaluator_name, evaluation_date,
                               evaluation_notes, audio_duration
                        FROM cambridge_submissions
                        WHERE ${conditions.join(' AND ')}
                        ORDER BY created_at DESC`;

        const result = await dbClient.query(query, params);
        // Wrap in {success, submissions} for consistency with IELTS /my-submissions
        res.json({ success: true, submissions: result.rows });
    } catch (error) {
        console.error('Failed to fetch student submissions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
});

// Get answer keys for a level/skill (student-facing, for answer checking)
// Security: requires student_id+student_name combo, validates level/skill, scoped to specific mock
app.get('/my-answer-keys', submissionLimiter, async (req, res) => {
    try {
        const { level, skill, mock, student_id, student_name } = req.query;
        if (!level || !skill) {
            return res.status(400).json({ success: false, message: 'level and skill are required' });
        }
        if (!student_id || !student_name) {
            return res.status(400).json({ success: false, message: 'student_id and student_name are required' });
        }
        // Fail-fast on invalid enums to prevent silent dead-end queries
        if (!VALID_LEVELS.includes(level)) {
            return res.status(400).json({ success: false, message: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
        }
        if (!VALID_SKILLS.includes(skill)) {
            return res.status(400).json({ success: false, message: `Invalid skill. Must be one of: ${VALID_SKILLS.join(', ')}` });
        }

        const dbClient = await ensureConnection();

        // Verify the student_id+student_name combo submitted THIS specific mock.
        // Mock scoping prevents cross-mock cheating; name+id verification raises the bar
        // against impersonation attacks.
        const submissionCheckParams = [String(student_id), String(student_name), level, skill];
        let submissionCheckQuery = `SELECT id FROM cambridge_submissions
                                    WHERE student_id = $1 AND student_name = $2 AND level = $3 AND skill = $4`;
        if (mock) {
            submissionCheckQuery += ` AND mock_test = $5`;
            submissionCheckParams.push(String(mock));
        }
        submissionCheckQuery += ` LIMIT 1`;
        const submissionCheck = await dbClient.query(submissionCheckQuery, submissionCheckParams);

        if (submissionCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Answer keys are only available after you have submitted this test'
            });
        }

        let query = 'SELECT answers FROM cambridge_answer_keys WHERE level = $1 AND skill = $2';
        const params = [level, skill];

        if (mock) {
            query += ' AND mock_test = $3';
            params.push(String(mock));
        }

        query += ' ORDER BY updated_at DESC LIMIT 1';
        const result = await dbClient.query(query, params);

        if (result.rows.length === 0) {
            return res.json({ success: true, answers: {}, count: 0 });
        }

        const answers = result.rows[0].answers || {};
        res.json({ success: true, answers, count: Object.keys(answers).length, mock: mock || null });
    } catch (error) {
        console.error('Failed to fetch answer keys:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch answer keys' });
    }
});

// ============================================
// ADMIN-ONLY ENDPOINTS
// ============================================

// Save Cambridge test submission (rate limited)
app.post('/cambridge-submissions', submissionLimiter, async (req, res) => {
    try {
        const submissionData = req.body;

        // Validate required fields (Issue 2: empty/whitespace names, Issue 4: malformed submissions)
        const studentCheck = validateStudentInfo(submissionData.studentId, submissionData.studentName);
        if (!studentCheck.valid) {
            return res.status(400).json({ success: false, message: studentCheck.error });
        }
        // Use sanitized values for downstream insert (strips null bytes/control chars)
        submissionData.studentId = studentCheck.studentId;
        submissionData.studentName = studentCheck.studentName;
        if (!submissionData.level || !VALID_LEVELS.includes(submissionData.level)) {
            return res.status(400).json({ success: false, message: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
        }
        if (!submissionData.skill || !VALID_SKILLS.includes(submissionData.skill)) {
            return res.status(400).json({ success: false, message: `Invalid skill. Must be one of: ${VALID_SKILLS.join(', ')}` });
        }
        // Olympiada is locked to C1-Advanced — reject any other level/exam pairing.
        // Mirrors the client-side guard in dashboard-cambridge.html selectLevel().
        if (submissionData.examType === 'Olympiada' && submissionData.level !== 'C1-Advanced') {
            console.warn(`🚨 OLYMPIADA LEVEL VIOLATION: student ${submissionData.studentId} tried to submit ${submissionData.level} as Olympiada`);
            return res.status(400).json({
                success: false,
                message: 'Olympiada exam is locked to C1-Advanced. Other levels are not allowed.'
            });
        }
        if (!submissionData.answers) {
            return res.status(400).json({ success: false, message: 'Answers are required' });
        }

        // SECURITY: student-side submissions never carry a real score.
        // Cambridge tests are admin-graded via /update-score (admin auth required).
        // If a malicious client tampered with the body to forge a score, log it as
        // an anti-cheat violation and force it back to null. This prevents the
        // dashboard "Completed (X/Y)" badge from displaying a fraudulent score.
        if (submissionData.score != null || submissionData.grade != null) {
            console.warn(`🚨 SCORE TAMPERING DETECTED: Student ${submissionData.studentId} sent score=${submissionData.score} grade=${submissionData.grade} on student-submission endpoint. Forcing to null (admin-graded only).`);
            submissionData.antiCheat = Object.assign({}, submissionData.antiCheat || {}, {
                scoreTamper: true,
                clientScore: submissionData.score,
                clientGrade: submissionData.grade
            });
            submissionData.score = null;
            submissionData.grade = null;
        }
        // Validate score and grade if provided (still runs for safety / future flexibility)
        const validationError = validateScoreAndGrade(submissionData.score, submissionData.grade);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        // Server-side duration validation — require timestamps and reject suspicious durations
        if (!submissionData.startTime || !submissionData.endTime) {
            return res.status(400).json({ success: false, message: 'startTime and endTime are required' });
        }
        const start = new Date(submissionData.startTime);
        const end = new Date(submissionData.endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid startTime or endTime format' });
        }
        const elapsedMin = (end - start) / 60000;
        if (elapsedMin <= 0) {
            return res.status(400).json({ success: false, message: 'endTime must be after startTime' });
        }
        // Minimum-time guard: an exam taking less than 30s is physically impossible.
        // Catches DevTools cheaters who POST a forged submission with endTime = startTime + ms.
        const MIN_ELAPSED_SEC = 30;
        if (elapsedMin * 60 < MIN_ELAPSED_SEC) {
            console.warn(`🚨 SUBMISSION REJECTED: Student ${submissionData.studentId} took only ${(elapsedMin*60).toFixed(1)}s for ${submissionData.level} ${submissionData.skill} (min: ${MIN_ELAPSED_SEC}s)`);
            return res.status(400).json({
                success: false,
                message: 'Submission rejected: test duration is below the minimum allowed.'
            });
        }
        const levelLimits = CAMBRIDGE_TIME_LIMITS[submissionData.level] || {};
        const limit = levelLimits[submissionData.skill] || 90;

        // Hard reject: 3x the time limit
        if (elapsedMin > limit * 3) {
            console.warn(`🚨 SUBMISSION REJECTED: Student ${submissionData.studentId} took ${Math.round(elapsedMin)}min for ${submissionData.level} ${submissionData.skill} (limit: ${limit}min, max: ${limit * 3}min)`);
            return res.status(400).json({
                success: false,
                message: 'Submission rejected: test duration exceeded the maximum allowed time.'
            });
        }

        // Soft flag: 2x the time limit — accept but mark for review
        if (elapsedMin > limit * 2) {
            console.warn(`⚠️ DURATION ALERT: Student ${submissionData.studentId} took ${Math.round(elapsedMin)}min for ${submissionData.level} ${submissionData.skill} (limit: ${limit}min)`);
        }

        // In-memory lock + DB dedup check — prevents race conditions with singleton Client
        const mockTest = submissionData.mockTest || '1';
        const dedupKey = `cam:${studentCheck.studentId}:${submissionData.level}:${submissionData.skill}:${mockTest}`;
        if (submissionLocks.has(dedupKey)) {
            return res.status(409).json({ success: false, message: 'Submission already in progress. Please wait.' });
        }
        submissionLocks.add(dedupKey);
        try {
            const dbClient = await ensureConnection();
            const dupCheck = await dbClient.query(
                `SELECT id FROM cambridge_submissions
                 WHERE student_id = $1 AND level = $2 AND skill = $3 AND mock_test = $4 LIMIT 1`,
                [studentCheck.studentId, submissionData.level, submissionData.skill, mockTest]
            );
            if (dupCheck.rows.length > 0) {
                console.warn(`⚠️ DUPLICATE SUBMISSION BLOCKED: Student ${studentCheck.studentId} already submitted ${submissionData.level} ${submissionData.skill} mock ${mockTest}`);
                return res.status(409).json({
                    success: false,
                    message: 'You have already submitted this test. Only one submission per test is allowed.'
                });
            }
            const savedId = await insertCambridgeSubmission(dbClient, submissionData);

            res.json({
                success: true,
                message: 'Cambridge test submission saved successfully',
                id: savedId
            });
        } finally {
            submissionLocks.delete(dedupKey);
        }

    } catch (error) {
        console.error('Cambridge submission save error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save Cambridge submission',
            error: error.message
        });
    }
});

// Save Cambridge Speaking test submission with audio (rate limited)
app.post('/submit-speaking', submissionLimiter, async (req, res) => {
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
        const studentCheck = validateStudentInfo(studentId, studentName);
        if (!studentCheck.valid) {
            return res.status(400).json({ success: false, message: studentCheck.error });
        }
        const trimmedId = studentCheck.studentId;
        const trimmedName = studentCheck.studentName;

        // Validate level and skill
        if (!VALID_LEVELS.includes(level)) {
            return res.status(400).json({ success: false, message: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
        }
        if (!skill || !VALID_SKILLS.includes(skill)) {
            return res.status(400).json({ success: false, message: `Invalid skill. Must be one of: ${VALID_SKILLS.join(', ')}` });
        }
        // Olympiada is locked to C1-Advanced — same enforcement as the regular submission endpoint
        if (req.body.examType === 'Olympiada' && level !== 'C1-Advanced') {
            console.warn(`🚨 OLYMPIADA SPEAKING LEVEL VIOLATION: student ${trimmedId} tried to submit ${level} speaking as Olympiada`);
            return res.status(400).json({
                success: false,
                message: 'Olympiada exam is locked to C1-Advanced. Other levels are not allowed.'
            });
        }

        // Validate duration (must be non-negative if provided)
        const safeDuration = (typeof duration === 'number' && duration >= 0) ? duration : null;

        // Sanitize mimeType — only allow valid audio MIME types
        const VALID_MIME_PATTERN = /^audio\/[\w.+-]+$/;
        const safeMimeType = (typeof mimeType === 'string' && VALID_MIME_PATTERN.test(mimeType)) ? mimeType : 'audio/webm';

        // Validate audioSize (must be non-negative if provided)
        const safeAudioSize = (typeof audioSize === 'number' && audioSize >= 0 && audioSize <= 100) ? audioSize : null;

        // Validate audioData type and length — prevents DoS via massive submissions
        if (audioData != null && typeof audioData !== 'string') {
            return res.status(400).json({ success: false, message: 'audioData must be a base64 string' });
        }
        const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15MB raw base64 string ≈ 11MB decoded audio
        if (typeof audioData === 'string' && audioData.length > MAX_AUDIO_BYTES) {
            return res.status(413).json({ success: false, message: `audioData exceeds maximum size of ${MAX_AUDIO_BYTES} bytes` });
        }

        // Server-side duration validation — sibling endpoint /cambridge-submissions has this;
        // /submit-speaking was missing it entirely (R26 parallel-code gap). Mirror the same
        // require-timestamps + reverse-time + min-time + over-time guards here.
        if (!startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'startTime and endTime are required' });
        }
        const speakStart = new Date(startTime);
        const speakEnd = new Date(endTime);
        if (isNaN(speakStart.getTime()) || isNaN(speakEnd.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid startTime or endTime format' });
        }
        const speakElapsedMin = (speakEnd - speakStart) / 60000;
        if (speakElapsedMin <= 0) {
            return res.status(400).json({ success: false, message: 'endTime must be after startTime' });
        }
        // Minimum-time guard: 30s minimum (same threshold as the regular submission endpoint).
        // A speaking test has a 15-min slot; sub-30s is impossible by any human and indicates a forged POST.
        const SPEAK_MIN_ELAPSED_SEC = 30;
        if (speakElapsedMin * 60 < SPEAK_MIN_ELAPSED_SEC) {
            console.warn(`🚨 SPEAKING SUBMISSION REJECTED: Student ${trimmedId} took only ${(speakElapsedMin*60).toFixed(1)}s for ${level} ${skill} (min: ${SPEAK_MIN_ELAPSED_SEC}s)`);
            return res.status(400).json({
                success: false,
                message: 'Submission rejected: test duration is below the minimum allowed.'
            });
        }
        // Hard reject overtime — speaking slots are at most 15min; allow up to 3x as cushion.
        const speakLevelLimits = CAMBRIDGE_TIME_LIMITS[level] || {};
        const speakLimit = speakLevelLimits[skill] || 30;
        if (speakElapsedMin > speakLimit * 3) {
            console.warn(`🚨 SPEAKING SUBMISSION REJECTED: Student ${trimmedId} took ${Math.round(speakElapsedMin)}min for ${level} ${skill} (limit: ${speakLimit}min)`);
            return res.status(400).json({
                success: false,
                message: 'Submission rejected: test duration exceeded the maximum allowed time.'
            });
        }

        // In-memory lock + DB dedup check — prevents race conditions with singleton Client
        const safeMockTest = mockTest || '1';
        const dedupKey = `cam-spk:${trimmedId}:${level}:${skill}:${safeMockTest}`;
        if (submissionLocks.has(dedupKey)) {
            return res.status(409).json({ success: false, message: 'Submission already in progress. Please wait.' });
        }
        submissionLocks.add(dedupKey);
        try {
            const dbClient = await ensureConnection();
            const dupCheck = await dbClient.query(
                `SELECT id FROM cambridge_submissions
                 WHERE student_id = $1 AND level = $2 AND skill = $3 AND mock_test = $4 LIMIT 1`,
                [trimmedId, level, skill, safeMockTest]
            );
            if (dupCheck.rows.length > 0) {
                console.warn(`⚠️ DUPLICATE SPEAKING SUBMISSION BLOCKED: Student ${trimmedId} already submitted ${level} ${skill} mock ${safeMockTest}`);
                return res.status(409).json({
                    success: false,
                    message: 'You have already submitted this speaking test. Only one submission is allowed.'
                });
            }

            console.log(`🎤 Saving speaking test: ${level} Mock ${safeMockTest} for ${trimmedName} (${safeAudioSize}MB, ${safeDuration}s)`);
            // Sanitize anti-cheat metadata (strip HTML, cap size/depth)
            const cleanSpeakAC = sanitizeAntiCheat(req.body.antiCheat) || {};
            const speakAntiCheatJson = Object.keys(cleanSpeakAC).length > 0 ? JSON.stringify(cleanSpeakAC) : null;
            // Honor client-supplied examType (Olympiada vs Cambridge).
            // Strict string check first — prevents single-element-array bypass via toString().
            const speakExamRaw = (typeof req.body.examType === 'string') ? req.body.examType.slice(0, 50) : 'Cambridge';
            const speakExamType = ['Cambridge', 'Olympiada'].includes(speakExamRaw) ? speakExamRaw : 'Cambridge';
            const result = await dbClient.query(`
                INSERT INTO cambridge_submissions
                (student_id, student_name, exam_type, level, mock_test, skill,
                 answers, audio_data, audio_size, audio_duration, audio_mime_type,
                 start_time, end_time, evaluated, anti_cheat_data)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id
            `, [
                trimmedId, trimmedName, speakExamType, level, safeMockTest, skill,
                JSON.stringify({}), audioData, safeAudioSize, safeDuration, safeMimeType,
                startTime, endTime, false, speakAntiCheatJson
            ]);

            console.log(`✅ Speaking test saved with ID: ${result.rows[0].id}`);
            res.json({
                success: true,
                message: 'Speaking test submitted successfully',
                id: result.rows[0].id
            });
        } finally {
            submissionLocks.delete(dedupKey);
        }

    } catch (error) {
        console.error('❌ Speaking submission failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to save speaking test',
            error: error.message
        });
    }
});

// Get all Cambridge submissions (admin only — exposes all student data)
app.get('/cambridge-submissions', requireAdmin, async (req, res) => {
    try {
        const { level, skill, student_id, mock_test } = req.query;

        const dbClient = await ensureConnection();
        // When student_id is provided, exclude audio_data to keep response small
        const selectCols = student_id
            ? 'id, student_id, student_name, exam_type, level, mock_test, skill, answers, score, grade, start_time, end_time, created_at, evaluated, evaluator_name, evaluation_date, evaluation_notes, anti_cheat_data'
            : '*';
        let query = `SELECT ${selectCols} FROM cambridge_submissions`;
        const params = [];
        const conditions = [];

        if (student_id) {
            conditions.push(`student_id = $${params.length + 1}`);
            params.push(student_id);
        }
        if (level) {
            conditions.push(`level = $${params.length + 1}`);
            params.push(level);
        }
        if (skill) {
            conditions.push(`skill = $${params.length + 1}`);
            params.push(skill);
        }
        if (mock_test) {
            conditions.push(`mock_test = $${params.length + 1}`);
            params.push(mock_test);
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

// Update score for a Cambridge submission (admin only)
app.patch('/cambridge-submissions/:id/score', requireAdmin, async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id, 10);
        if (isNaN(submissionId) || submissionId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid submission ID' });
        }
        const { score, grade } = req.body;

        // Validate score and grade
        const validationError = validateScoreAndGrade(score, grade);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        console.log(`📊 Updating score for Cambridge submission ${submissionId}: ${score}, Grade: ${grade || 'N/A'}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            UPDATE cambridge_submissions
            SET score = $1, grade = $2
            WHERE id = $3
            RETURNING *
        `, [score, grade || null, submissionId]);

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

// Update speaking test evaluation (admin only)
app.patch('/cambridge-submissions/:id/evaluate', requireAdmin, async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id, 10);
        if (isNaN(submissionId) || submissionId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid submission ID' });
        }
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

        console.log(`🎤 Evaluating speaking test ${submissionId} by ${sanitizedEvaluatorName}: ${score}, Grade: ${grade || 'N/A'}`);

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
        `, [score, grade || null, sanitizedEvaluatorName, sanitizedEvaluationNotes, submissionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Speaking submission not found'
            });
        }

        console.log(`✅ Speaking test ${submissionId} evaluated successfully`);

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



// Delete a Cambridge submission (admin only)
app.delete('/cambridge-submissions/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const submissionId = parseInt(id, 10);
        if (isNaN(submissionId) || submissionId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid submission ID' });
        }
        const dbClient = await ensureConnection();
        const result = await dbClient.query(
            'DELETE FROM cambridge_submissions WHERE id = $1 RETURNING id',
            [submissionId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }
        console.log(`🗑️ Deleted Cambridge submission ${submissionId}`);
        res.json({ success: true, message: `Submission ${submissionId} deleted` });
    } catch (error) {
        console.error('❌ Failed to delete Cambridge submission:', error);
        res.status(500).json({ success: false, message: 'Failed to delete submission', error: error.message });
    }
});

// Get Cambridge answer keys (admin only)
app.get('/cambridge-answers', requireAdmin, async (req, res) => {
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

// Save Cambridge answer keys (admin only)
app.post('/cambridge-answers', requireAdmin, async (req, res) => {
    try {
        const { level, skill, mock, answers } = req.body;

        if (!level || !skill || !answers) {
            return res.status(400).json({
                success: false,
                message: 'Level, skill, and answers are required'
            });
        }

        // Validate level and skill
        if (!VALID_LEVELS.includes(level)) {
            return res.status(400).json({ success: false, message: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
        }
        if (!VALID_SKILLS.includes(skill)) {
            return res.status(400).json({ success: false, message: `Invalid skill. Must be one of: ${VALID_SKILLS.join(', ')}` });
        }

        // Limit answer count to prevent storage abuse
        if (typeof answers !== 'object' || Object.keys(answers).length > 200) {
            return res.status(400).json({ success: false, message: 'Answers must be an object with at most 200 entries' });
        }

        // Sanitize answer values — strip HTML tags
        const sanitizedAnswers = {};
        for (const [key, val] of Object.entries(answers)) {
            if (typeof val === 'string') {
                sanitizedAnswers[key] = stripHtmlTags(val);
            } else if (Array.isArray(val)) {
                sanitizedAnswers[key] = val.map(v => typeof v === 'string' ? stripHtmlTags(v) : v);
            } else {
                sanitizedAnswers[key] = val;
            }
        }

        const mockTest = mock || '1';
        console.log(`💾 Saving Cambridge answer key: ${level} ${skill} Mock ${mockTest} (${Object.keys(sanitizedAnswers).length} answers)`);

        const dbClient = await ensureConnection();

        // Upsert (insert or update)
        const result = await dbClient.query(`
            INSERT INTO cambridge_answer_keys (level, skill, mock_test, answers, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (level, skill, mock_test)
            DO UPDATE SET answers = $4, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [level, skill, mockTest, JSON.stringify(sanitizedAnswers)]);

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

// Get all Cambridge student results with optional filters (admin only)
app.get('/cambridge-student-results', requireAdmin, async (req, res) => {
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
            conditions.push(`(student_name ILIKE $${params.length + 1} OR student_id ILIKE $${params.length + 2})`);
            params.push(`%${search}%`, `%${search}%`);
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

// Add new Cambridge student result (admin only)
app.post('/cambridge-student-results', requireAdmin, async (req, res) => {
    try {
        const data = req.body;

        // Validate required fields
        const trimmedId = typeof data.student_id === 'string' ? data.student_id.trim() : '';
        const trimmedName = typeof data.student_name === 'string' ? data.student_name.trim() : '';
        if (!trimmedId || !trimmedName) {
            return res.status(400).json({ success: false, message: 'Student ID and name are required' });
        }
        if (trimmedId.length > 200 || trimmedName.length > 200) {
            return res.status(400).json({ success: false, message: 'Student ID and name must be at most 200 characters' });
        }
        if (!data.level || !VALID_LEVELS.includes(data.level)) {
            return res.status(400).json({ success: false, message: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
        }

        // Sanitize text fields
        data.student_id = trimmedId;
        data.student_name = stripHtmlTags(trimmedName);
        if (data.cefr_level) data.cefr_level = stripHtmlTags(String(data.cefr_level));

        // Validate numeric score fields are within reasonable range (0-300 for Cambridge scale)
        const numericFields = [
            'reading_raw', 'reading_max', 'reading_scale',
            'writing_raw', 'writing_max', 'writing_scale',
            'listening_raw', 'listening_max', 'listening_scale',
            'speaking_raw', 'speaking_max', 'speaking_scale',
            'use_of_english_raw', 'use_of_english_max', 'use_of_english_scale',
            'reading_writing_raw', 'reading_writing_max', 'reading_writing_scale',
            'overall_scale', 'shields_listening', 'shields_reading_writing',
            'shields_speaking', 'total_shields'
        ];
        for (const field of numericFields) {
            if (data[field] != null) {
                const val = Number(data[field]);
                if (isNaN(val) || val < 0 || val > 300) {
                    return res.status(400).json({ success: false, message: `${field} must be between 0 and 300` });
                }
                data[field] = val;
            }
        }

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

// Update Cambridge student result (admin only)
app.patch('/cambridge-student-results/:id', requireAdmin, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id, 10);
        if (isNaN(resultId) || resultId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid student result ID' });
        }
        const data = req.body;

        // Sanitize text fields if provided
        if (data.student_name != null) data.student_name = stripHtmlTags(String(data.student_name).trim());
        if (data.student_id != null) data.student_id = String(data.student_id).trim();
        if (data.cefr_level != null) data.cefr_level = stripHtmlTags(String(data.cefr_level));

        // Validate level if provided
        if (data.level && !VALID_LEVELS.includes(data.level)) {
            return res.status(400).json({ success: false, message: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
        }

        // Validate numeric fields if provided
        const numericFields = [
            'reading_raw', 'reading_max', 'reading_scale',
            'writing_raw', 'writing_max', 'writing_scale',
            'listening_raw', 'listening_max', 'listening_scale',
            'speaking_raw', 'speaking_max', 'speaking_scale',
            'use_of_english_raw', 'use_of_english_max', 'use_of_english_scale',
            'reading_writing_raw', 'reading_writing_max', 'reading_writing_scale',
            'overall_scale', 'shields_listening', 'shields_reading_writing',
            'shields_speaking', 'total_shields'
        ];
        for (const field of numericFields) {
            if (data[field] != null) {
                const val = Number(data[field]);
                if (isNaN(val) || val < 0 || val > 300) {
                    return res.status(400).json({ success: false, message: `${field} must be between 0 and 300` });
                }
                data[field] = val;
            }
        }

        console.log(`📊 Updating student result ID ${resultId}`);

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
            resultId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student result not found'
            });
        }

        console.log(`✅ Student result ${resultId} updated successfully`);

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

// Delete Cambridge student result (admin only)
app.delete('/cambridge-student-results/:id', requireAdmin, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id, 10);
        if (isNaN(resultId) || resultId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid student result ID' });
        }

        console.log(`🗑️ Deleting student result ID ${resultId}`);

        const dbClient = await ensureConnection();
        const result = await dbClient.query(
            'DELETE FROM cambridge_student_results WHERE id = $1 RETURNING *',
            [resultId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student result not found'
            });
        }

        console.log(`✅ Student result ${resultId} deleted`);

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

// Delete Cambridge answer keys (admin only)
app.delete('/cambridge-answers', requireAdmin, async (req, res) => {
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
            return res.status(404).json({
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
