// IELTS Local Database Server — CJS packaged version for pkg distribution
// Synced with local-database-server.js (ESM) as of ADR-029
// Run this with: node server-cjs.cjs

require('dotenv').config();
const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');
const open = require('open');

// ============================================
// ERROR HANDLING (CJS-specific)
// ============================================

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
});

process.on('unhandledRejection', (reason, promise) => {
    logError(reason);
});

// ============================================
// INLINE SHARED MODULES (CJS can't import ESM)
// Mirrored from: shared/auth.js, shared/validation.js
// ============================================

// --- Auth (from shared/auth.js) ---
const validTokens = new Set();

function registerToken(token) {
    validTokens.add(token);
}

function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const token = authHeader.slice(7);
    if (!validTokens.has(token)) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    next();
}

function rateLimit({ windowMs = 60000, maxRequests = 30, message = 'Too many requests' } = {}) {
    const hits = new Map();
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        let entry = hits.get(ip);
        if (!entry || now > entry.resetTime) {
            entry = { count: 0, resetTime: now + windowMs };
            hits.set(ip, entry);
        }
        entry.count++;
        if (entry.count > maxRequests) {
            return res.status(429).json({ success: false, message });
        }
        next();
    };
}

// --- Validation (from shared/validation.js) ---
function validateScore(score) {
    if (score === null || score === undefined || score === '') return { valid: true };
    const parsed = Number(score);
    if (!Number.isInteger(parsed)) return { valid: false, error: 'Score must be an integer' };
    if (parsed < 0 || parsed > 200) return { valid: false, error: 'Score must be between 0 and 200' };
    return { valid: true, value: parsed };
}

function validateStudentInfo(studentId, studentName) {
    // Strip null bytes and control chars (PG UTF8 rejects them, header injection vector)
    const sanitize = (s) => typeof s === 'string'
        ? s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
        : '';
    const id = sanitize(studentId);
    const name = sanitize(studentName);
    if (!id || !name) return { valid: false, error: 'Student ID and name are required' };
    if (id.length > 200 || name.length > 200) return { valid: false, error: 'Student ID and name must be at most 200 characters' };
    return { valid: true, studentId: id, studentName: name };
}

function stripHtmlTags(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '');
}

// Schema-driven type enforcement for known anti-cheat fields. Defeats type
// confusion bypasses against the dashboard violation checks.
const ANTI_CHEAT_SCHEMA = {
    tabSwitches: 'counter', windowBlurs: 'counter', fullscreenExits: 'counter',
    copyAttempts: 'counter', pasteAttempts: 'counter', rightClickAttempts: 'counter',
    blockedShortcuts: 'counter',
    distractionFreeEnabled: 'boolean', durationFlag: 'boolean',
    firstViolationAt: 'date', lastViolationAt: 'date'
};
function coerceSchemaValue(key, value) {
    const type = ANTI_CHEAT_SCHEMA[key];
    if (!type) return undefined;
    if (type === 'counter') {
        if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) return null;
        return value;
    }
    if (type === 'boolean') {
        if (typeof value !== 'boolean') return null;
        return value;
    }
    if (type === 'date') {
        if (typeof value !== 'string') return null;
        const d = new Date(value);
        if (isNaN(d.getTime())) return null;
        return value.slice(0, 50);
    }
    return null;
}

// Sanitize and bound a client-supplied anti-cheat metadata object.
// - Schema-enforced types on known anti-cheat fields (defeats dashboard bypass)
// - Strips HTML from string values, caps size/depth, removes server-managed keys.
function sanitizeAntiCheat(input, serverManagedKeys) {
    serverManagedKeys = serverManagedKeys || [];
    if (input == null || typeof input !== 'object' || Array.isArray(input)) return null;
    const MAX_DEPTH = 4, MAX_KEYS = 50, MAX_STRING = 500, MAX_BYTES = 4096;
    function clean(value, depth) {
        if (value == null) return null;
        if (typeof value === 'string') {
            // Drop strings that become empty/whitespace after HTML stripping —
            // they're useless metadata and may indicate sanitized XSS attempts.
            const stripped = stripHtmlTags(value).trim().slice(0, MAX_STRING);
            return stripped === '' ? null : stripped;
        }
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (depth >= MAX_DEPTH) return null;
        if (Array.isArray(value)) {
            return value.slice(0, MAX_KEYS).map(v => clean(v, depth + 1)).filter(v => v !== null);
        }
        if (typeof value === 'object') {
            const out = {};
            let count = 0;
            for (const key of Object.keys(value)) {
                if (count >= MAX_KEYS) break;
                if (serverManagedKeys.indexOf(key) !== -1) continue;
                const cleaned = clean(value[key], depth + 1);
                if (cleaned !== null) { out[key] = cleaned; count++; }
            }
            return out;
        }
        return null;
    }

    const out = {};
    let count = 0;
    for (const key of Object.keys(input)) {
        if (count >= MAX_KEYS) break;
        if (serverManagedKeys.indexOf(key) !== -1) continue;
        if (key in ANTI_CHEAT_SCHEMA) {
            const coerced = coerceSchemaValue(key, input[key]);
            if (coerced !== null && coerced !== undefined) {
                out[key] = coerced;
                count++;
            }
            continue;
        }
        const cleaned = clean(input[key], 1);
        if (cleaned !== null) {
            out[key] = cleaned;
            count++;
        }
    }
    if (Object.keys(out).length === 0) return null;
    if (JSON.stringify(out).length > MAX_BYTES) return null;
    return out;
}

// ============================================
// EXPRESS SETUP
// ============================================

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handle JSON parse errors
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
    }
    next(err);
});

// ============================================
// LICENSE MANAGEMENT (CJS-specific for pkg)
// ============================================

const LICENSE_FILE = 'license.key';
const SALT = 'INNOVATIVE_CENTRE_SECURE_SALT_2024';

function getMachineId() {
    try {
        return machineIdSync();
    } catch (e) {
        return 'UNKNOWN-MACHINE-ID';
    }
}

function isLicenseValid() {
    try {
        if (!fs.existsSync(LICENSE_FILE)) return false;
        const savedKey = fs.readFileSync(LICENSE_FILE, 'utf8').trim();
        const currentMachineId = getMachineId();
        const expectedKey = crypto.createHash('sha256')
            .update(currentMachineId + SALT)
            .digest('hex')
            .toUpperCase()
            .substring(0, 16)
            .match(/.{1,4}/g)
            .join('-');
        return savedKey === expectedKey;
    } catch (e) {
        return false;
    }
}

const checkLicense = (req, res, next) => {
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
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            res.status(403).json({ success: false, message: 'License required' });
        } else {
            res.redirect('/license.html');
        }
    }
};

app.use(checkLicense);

// License endpoints
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

// ============================================
// PATH SECURITY (from shared/server-bootstrap.js)
// ============================================

const blockedPaths = [
    /^\/\.git(\/|$)/,
    /^\/\.claude(\/|$)/,
    /^\/\.env/,
    /^\/\.scenario-cursor\.json$/,
    /^\/\.eye-cursor\.json$/,
    /^\/node_modules(\/|$)/,
    /^\/shared(\/|$)/,
    /^\/package(-lock)?\.json$/,
    /^\/(local-database-server|cambridge-database-server|server-cjs|server-bundled|keygen)\.js$/,
    /^\/server-cjs\.cjs$/,
    /^\/scenario-journal\.md$/,
    /^\/architect-decisions\.md$/,
    /^\/\.gitignore$/,
    /^\/tsconfig/,
    /^\/\.eslint/,
    /^\/autopilot-(cursor|journal)\.(json|md)$/,
    /^\/error\.log$/,
    /^\/\.playwright-cli(\/|$)/,
];

app.use((req, res, next) => {
    let normalized;
    try {
        normalized = decodeURIComponent(req.path);
    } catch {
        normalized = req.path;
    }
    normalized = normalized.toLowerCase().replace(/\\/g, '/').replace(/\/+/g, '/');
    if (blockedPaths.some(re => re.test(normalized))) {
        return res.status(404).send('Not found');
    }
    next();
});

// ============================================
// STATIC FILE SERVING
// ============================================

if (process.pkg) {
    app.use(express.static(path.join(__dirname, 'public'), { index: false }));
    app.use(express.static(__dirname, { index: false }));
} else {
    app.use(express.static('./', { index: false }));
}

// ============================================
// DATABASE CONNECTION
// ============================================

let client;
let isConnecting = false;

const DATABASE_CONFIG = {
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_2yHMSvBcN6rI@ep-old-tooth-agav7q24-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
};

async function createDatabaseConnection() {
    if (isConnecting) return;
    isConnecting = true;
    try {
        if (client) {
            try { await client.end(); } catch (e) { /* ignore */ }
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

// ============================================
// BACKGROUND RETRY QUEUE
// ============================================

const failedSubmissions = [];

async function backgroundRetrySystem() {
    if (failedSubmissions.length === 0) return;
    console.log(`🔄 Background retry: ${failedSubmissions.length} submissions pending...`);
    const toRetry = [...failedSubmissions];
    failedSubmissions.length = 0;

    for (const submission of toRetry) {
        try {
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
            console.log('❌ Background retry failed, will try again in 90s');
            failedSubmissions.push(submission);
        }
    }
}

setInterval(backgroundRetrySystem, 90000);

async function saveWithRetry(data, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
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
                console.log('🔄 Retrying in 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    console.log('📋 Adding to background retry queue (will retry every 90s)');
    failedSubmissions.push({ data, timestamp: new Date().toISOString() });
    throw new Error('Immediate save failed - added to background retry queue');
}

// ============================================
// SHARED ROUTES (admin login, invigilator)
// ============================================

// Root redirect
app.get('/', (req, res) => {
    res.redirect('/launcher.html');
});

// Admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.resolve('ielts-admin-dashboard.html'));
});

// Rate limit auth endpoints to prevent brute force (5 attempts per minute per IP)
const authLimiter = rateLimit({ windowMs: 60000, maxRequests: 5, message: 'Too many login attempts. Try again in a minute.' });

// Admin login (rate limited)
app.post('/admin-login', authLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    if (username === 'admin' && password === adminPassword) {
        const token = 'admin-session-' + crypto.randomBytes(32).toString('hex');
        registerToken(token);
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Admin logout — invalidates the token server-side
app.post('/admin-logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        validTokens.delete(token);
    }
    res.json({ success: true, message: 'Logged out' });
});

// Invigilator password verification (rate limited)
app.post('/verify-invigilator', authLimiter, (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
        return res.status(400).json({ success: false, message: 'Password is required' });
    }
    const correctPassword = process.env.INVIGILATOR_PASSWORD || '';
    if (password === correctPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Incorrect password' });
    }
});

// IELTS raw → band score mapping (server-side, used for anti-tamper recompute)
const IELTS_BAND_MAPPING = {
    40: '9.0', 39: '9.0', 38: '8.5', 37: '8.5', 36: '8.0', 35: '8.0', 34: '7.5',
    33: '7.5', 32: '7.0', 31: '7.0', 30: '7.0', 29: '6.5', 28: '6.5', 27: '6.5',
    26: '6.0', 25: '6.0', 24: '6.0', 23: '5.5', 22: '5.5', 21: '5.5', 20: '5.5',
    19: '5.0', 18: '5.0', 17: '5.0', 16: '5.0', 15: '5.0', 14: '4.5', 13: '4.5',
    12: '4.0', 11: '4.0', 10: '4.0', 9: '3.5', 8: '3.5', 7: '3.0', 6: '3.0',
    5: '2.5', 4: '2.5'
};
function bandScoreFromRaw(score) {
    if (typeof score !== 'number' || !Number.isFinite(score)) return null;
    if (score <= 0) return '0.0';
    if (score === 1) return '1.0';
    if (score <= 3) return '2.0';
    return IELTS_BAND_MAPPING[score] || '0.0';
}

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

// ============================================
// IELTS-SPECIFIC ROUTES
// ============================================

const submissionLimiter = rateLimit({ windowMs: 60000, maxRequests: 10, message: 'Too many submissions. Try again later.' });
const IELTS_TIME_LIMITS = { reading: 60, writing: 60, listening: 40, speaking: 20 };
const VALID_IELTS_SKILLS = Object.keys(IELTS_TIME_LIMITS);

// Ensure DB skill constraint includes speaking + anti_cheat_data column
(async () => {
    try {
        const db = await ensureConnection();
        await db.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage
                           WHERE table_name = 'test_submissions' AND constraint_name = 'test_submissions_skill_check') THEN
                    ALTER TABLE test_submissions DROP CONSTRAINT test_submissions_skill_check;
                END IF;
                ALTER TABLE test_submissions ADD CONSTRAINT test_submissions_skill_check
                    CHECK (skill IN ('reading', 'writing', 'listening', 'speaking'));
            END $$;
        `);
        console.log('✅ Skill constraint updated to include speaking');

        // Add anti_cheat_data JSONB column for invigilator visibility into violations
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'test_submissions' AND column_name = 'anti_cheat_data'
                ) THEN
                    ALTER TABLE test_submissions ADD COLUMN anti_cheat_data JSONB;
                END IF;
            END $$;
        `);
        console.log('✅ anti_cheat_data column ready');
    } catch (e) { /* constraint may not exist yet */ }
})();

// In-memory dedup lock — prevents concurrent submissions for same student+skill+mock
const submissionLocks = new Set();

// Save test submission (rate-limited, validated, deduplicated)
app.post('/submissions', submissionLimiter, async (req, res) => {
    try {
        const submissionData = req.body;

        // Validate required fields
        const studentCheck = validateStudentInfo(submissionData.studentId, submissionData.studentName);
        if (!studentCheck.valid) {
            return res.status(400).json({ success: false, message: studentCheck.error });
        }
        if (!submissionData.skill || !VALID_IELTS_SKILLS.includes(submissionData.skill)) {
            return res.status(400).json({ success: false, message: `Invalid skill. Must be one of: ${VALID_IELTS_SKILLS.join(', ')}` });
        }

        // Validate mockNumber — must be a positive integer
        const parsedMock = parseInt(submissionData.mockNumber, 10);
        if (isNaN(parsedMock) || parsedMock < 1) {
            return res.status(400).json({ success: false, message: 'mockNumber must be a positive integer' });
        }
        submissionData.mockNumber = parsedMock;

        // Duration validation — require timestamps and reject suspicious durations
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
        // Even reading mock has 40 questions; reading them at 1s each is 40s. This catches
        // DevTools cheaters who skip the UI entirely and POST a forged submission with
        // endTime = startTime + a few hundred ms.
        const MIN_ELAPSED_SEC = 30;
        if (elapsedMin * 60 < MIN_ELAPSED_SEC) {
            console.warn(`🚨 SUBMISSION REJECTED: Student ${studentCheck.studentId} took only ${(elapsedMin*60).toFixed(1)}s for ${submissionData.skill} mock ${submissionData.mockNumber} (min: ${MIN_ELAPSED_SEC}s)`);
            return res.status(400).json({
                success: false,
                message: 'Submission rejected: test duration is below the minimum allowed.'
            });
        }
        const limit = IELTS_TIME_LIMITS[submissionData.skill] || 60;

        if (elapsedMin > limit * 3) {
            console.warn(`🚨 SUBMISSION REJECTED: Student ${submissionData.studentId} took ${Math.round(elapsedMin)}min for ${submissionData.skill} (limit: ${limit}min)`);
            return res.status(400).json({
                success: false,
                message: 'Submission rejected: test duration exceeded the maximum allowed time.'
            });
        }

        if (elapsedMin > limit * 2) {
            console.warn(`⚠️ DURATION ALERT: Student ${submissionData.studentId} took ${Math.round(elapsedMin)}min for ${submissionData.skill}`);
            submissionData.durationFlag = true;
        }

        // In-memory lock + DB dedup check — prevents race conditions with singleton Client
        const dedupKey = `ielts:${studentCheck.studentId}:${submissionData.skill}:${submissionData.mockNumber}`;
        if (submissionLocks.has(dedupKey)) {
            return res.status(409).json({ success: false, message: 'Submission already in progress. Please wait.' });
        }
        submissionLocks.add(dedupKey);
        try {
            const dbClient = await ensureConnection();
            const dupCheck = await dbClient.query(
                `SELECT id FROM test_submissions
                 WHERE student_id = $1 AND skill = $2 AND mock_number = $3 LIMIT 1`,
                [studentCheck.studentId, submissionData.skill, submissionData.mockNumber]
            );
            if (dupCheck.rows.length > 0) {
                console.warn(`⚠️ DUPLICATE SUBMISSION BLOCKED: Student ${studentCheck.studentId} already submitted ${submissionData.skill} mock ${submissionData.mockNumber}`);
                return res.status(409).json({
                    success: false,
                    message: 'You have already submitted this test. Only one submission per test is allowed.'
                });
            }

            // SECURITY: Recompute score server-side for auto-gradable skills (reading/listening).
            // The client computes a score from window.correctAnswers (loaded from a static JS file)
            // and sends it in the body. A cheater with DevTools could fake this score. Override
            // it with a server-side recomputation against mock_answers to make tampering futile.
            // Synced from local-database-server.js (autopilot cheater r6).
            if (submissionData.skill === 'reading' || submissionData.skill === 'listening') {
                try {
                    const keyRows = await dbClient.query(
                        'SELECT question_number, correct_answer FROM mock_answers WHERE mock_number = $1 AND skill = $2',
                        [submissionData.mockNumber, submissionData.skill]
                    );
                    if (keyRows.rows.length > 0) {
                        let correct = 0;
                        // Defensively coerce answers to a plain object (reject arrays, strings, null)
                        const studentAnswers = (submissionData.answers && typeof submissionData.answers === 'object' && !Array.isArray(submissionData.answers))
                            ? submissionData.answers : {};
                        const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
                        keyRows.rows.forEach(r => {
                            const qKey = String(r.question_number);
                            const studentRaw = studentAnswers[qKey];
                            if (studentRaw == null) return;
                            const expected = String(r.correct_answer || '');
                            const accepted = expected.includes('|') ? expected.split('|') :
                                             expected.includes('/') ? expected.split('/') : [expected];
                            if (accepted.some(a => norm(a) === norm(studentRaw))) correct++;
                        });
                        const clientScore = submissionData.score;
                        if (typeof clientScore === 'number' && clientScore !== correct) {
                            console.warn(`🚨 SCORE TAMPERING DETECTED: Student ${studentCheck.studentId} sent score=${clientScore}, server computed ${correct} for ${submissionData.skill} mock ${submissionData.mockNumber}`);
                            submissionData.antiCheat = Object.assign({}, submissionData.antiCheat || {}, { scoreTamper: true, clientScore: clientScore, serverScore: correct });
                        }
                        submissionData.score = correct;
                        submissionData.bandScore = bandScoreFromRaw(correct);
                    } else {
                        // No answer key in DB — clamp client score to valid range to prevent garbage
                        const cs = Number(submissionData.score);
                        submissionData.score = (Number.isFinite(cs) && cs >= 0 && cs <= 40) ? Math.round(cs) : null;
                        // Also clamp bandScore: must be a string like "0.0"–"9.0"
                        const bs = submissionData.bandScore;
                        if (typeof bs !== 'string' || !/^[0-9](?:\.[05])?$/.test(bs)) {
                            submissionData.bandScore = null;
                        }
                    }
                } catch (err) {
                    console.error('Server-side score recompute failed:', err);
                    const cs = Number(submissionData.score);
                    submissionData.score = (Number.isFinite(cs) && cs >= 0 && cs <= 40) ? Math.round(cs) : null;
                }
            } else {
                // SECURITY: writing/speaking are admin-graded via the dashboard
                // (ielts-admin-dashboard.html has a writingBandScore input). The student-side
                // submission must NEVER carry a band_score — anything the client sends is
                // tampering. Force to null and log it as an anti-cheat violation.
                if (submissionData.bandScore != null) {
                    console.warn(`🚨 BAND TAMPERING DETECTED: Student ${studentCheck.studentId} sent bandScore=${submissionData.bandScore} on ${submissionData.skill} mock ${submissionData.mockNumber}. Forcing to null (admin-graded only).`);
                    submissionData.antiCheat = Object.assign({}, submissionData.antiCheat || {}, {
                        scoreTamper: true,
                        clientBandScore: submissionData.bandScore
                    });
                }
                submissionData.bandScore = null;
                submissionData.score = null;
            }

            // Sanitize anti-cheat metadata: strips HTML, caps size/depth, removes server-managed keys
            const SERVER_AC_KEYS = ['durationFlag'];
            const cleanAC = sanitizeAntiCheat(submissionData.antiCheat, SERVER_AC_KEYS) || {};
            if (submissionData.durationFlag) cleanAC.durationFlag = true;
            const antiCheatJson = Object.keys(cleanAC).length > 0 ? JSON.stringify(cleanAC) : null;

            const result = await dbClient.query(`
                INSERT INTO test_submissions
                (student_id, student_name, mock_number, skill, answers, score, band_score, start_time, end_time, anti_cheat_data)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `, [studentCheck.studentId, studentCheck.studentName, submissionData.mockNumber,
            submissionData.skill, JSON.stringify(submissionData.answers), submissionData.score,
            submissionData.bandScore, submissionData.startTime, submissionData.endTime, antiCheatJson]);
            console.log(`✅ Saved with ID: ${result.rows[0].id}${antiCheatJson ? ' (with anti-cheat flags)' : ''}`);
            res.json({
                success: true,
                message: 'Test submission saved successfully',
                id: result.rows[0].id
            });
        } finally {
            submissionLocks.delete(dedupKey);
        }
    } catch (error) {
        console.error('Submission save error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save submission',
            error: error.message
        });
    }
});

// ============================================
// STUDENT-FACING ENDPOINTS (no admin auth, rate limited, scoped by student_id+student_name)
// Impersonation defense: requires both ID and name to match a real submission
// ============================================

// Get a student's own submissions (scoped by student_id+student_name)
app.get('/my-submissions', submissionLimiter, async (req, res) => {
    try {
        const { student_id, student_name, mock_number } = req.query;
        if (!student_id || !student_name) {
            return res.status(400).json({ success: false, message: 'student_id and student_name are required' });
        }

        const dbClient = await ensureConnection();

        // Verify the student_id+student_name combo matches a real submission.
        // Returns empty array (not 403) on no-match — same shape as "real student with no submissions"
        // to prevent enumeration via response distinction.
        const identityCheck = await dbClient.query(
            `SELECT 1 FROM test_submissions WHERE student_id = $1 AND student_name = $2 LIMIT 1`,
            [String(student_id), String(student_name)]
        );
        if (identityCheck.rows.length === 0) {
            return res.json({ success: true, submissions: [] });
        }

        const conditions = ['student_id = $1', 'student_name = $2'];
        const params = [String(student_id), String(student_name)];

        if (mock_number) {
            const mockNum = parseInt(mock_number, 10);
            if (isNaN(mockNum) || mockNum < 1) {
                return res.status(400).json({ success: false, message: 'mock_number must be a positive integer' });
            }
            conditions.push(`mock_number = $${params.length + 1}`);
            params.push(mockNum);
        }

        const query = `SELECT id, student_id, student_name, skill, mock_number, answers, score, band_score,
                              start_time, end_time, created_at
                       FROM test_submissions
                       WHERE ${conditions.join(' AND ')}
                       ORDER BY created_at DESC`;

        const result = await dbClient.query(query, params);
        res.json({ success: true, submissions: result.rows });
    } catch (error) {
        console.error('Failed to fetch student submissions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
});

// Get answer keys for a mock + skill (requires student_id+student_name match for THIS mock)
app.get('/my-answer-keys', submissionLimiter, async (req, res) => {
    try {
        const { mock, skill, student_id, student_name } = req.query;
        if (!mock || !skill) {
            return res.status(400).json({ success: false, message: 'mock and skill are required' });
        }
        if (!student_id || !student_name) {
            return res.status(400).json({ success: false, message: 'student_id and student_name are required' });
        }
        if (!VALID_IELTS_SKILLS.includes(skill)) {
            return res.status(400).json({ success: false, message: `Invalid skill. Must be one of: ${VALID_IELTS_SKILLS.join(', ')}` });
        }
        const mockNum = parseInt(mock, 10);
        if (isNaN(mockNum) || mockNum < 1) {
            return res.status(400).json({ success: false, message: 'mock must be a positive integer' });
        }

        const dbClient = await ensureConnection();

        // Verify student_id+student_name has submitted this skill+mock before revealing answer keys
        // (mock-scoped + name-verified — prevents impersonation and cross-mock cheating)
        const submissionCheck = await dbClient.query(
            `SELECT id FROM test_submissions
             WHERE student_id = $1 AND student_name = $2 AND skill = $3 AND mock_number = $4
             LIMIT 1`,
            [String(student_id), String(student_name), skill, mockNum]
        );

        if (submissionCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Answer keys are only available after you have submitted this test'
            });
        }

        const result = await dbClient.query(
            'SELECT question_number, correct_answer FROM mock_answers WHERE mock_number = $1 AND skill = $2 ORDER BY question_number',
            [mockNum, skill]
        );

        const answers = {};
        result.rows.forEach(row => {
            answers[String(row.question_number)] = row.correct_answer;
        });

        res.json({ success: true, answers, count: result.rows.length, mock: mockNum, skill });
    } catch (error) {
        console.error('Failed to fetch answer keys:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch answer keys' });
    }
});

// ============================================
// ADMIN-ONLY ENDPOINTS
// ============================================

// Get all submissions (admin only)
app.get('/submissions', requireAdmin, async (req, res) => {
    try {
        const dbClient = await ensureConnection();
        const result = await dbClient.query('SELECT * FROM test_submissions ORDER BY created_at DESC');
        res.json({ success: true, submissions: result.rows });
    } catch (error) {
        console.error('Failed to fetch submissions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions', error: error.message });
    }
});

// Delete a submission (admin only)
app.delete('/submissions/:id', requireAdmin, async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id, 10);
        if (isNaN(submissionId) || submissionId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid submission ID' });
        }
        const dbClient = await ensureConnection();
        const result = await dbClient.query('DELETE FROM test_submissions WHERE id = $1 RETURNING id', [submissionId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }
        console.log(`🗑️ Deleted submission ${submissionId}`);
        res.json({ success: true, message: `Submission ${submissionId} deleted` });
    } catch (error) {
        console.error('❌ Failed to delete submission:', error);
        res.status(500).json({ success: false, message: 'Failed to delete submission', error: error.message });
    }
});

// Update score (admin only, validated)
app.post('/update-score', requireAdmin, async (req, res) => {
    try {
        const { submissionId, score, bandScore } = req.body;
        if (!submissionId) {
            return res.status(400).json({ success: false, message: 'Submission ID is required' });
        }
        const scoreResult = validateScore(score);
        if (!scoreResult.valid) {
            return res.status(400).json({ success: false, message: scoreResult.error });
        }

        const dbClient = await ensureConnection();
        const result = await dbClient.query(`
            UPDATE test_submissions SET score = $1, band_score = $2 WHERE id = $3
            RETURNING id, score, band_score
        `, [score, bandScore, submissionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }
        console.log(`✅ Score updated for submission ${submissionId}`);
        res.json({ success: true, message: 'Score updated successfully', submission: result.rows[0] });
    } catch (error) {
        console.error('❌ Score update failed:', error);
        res.status(500).json({ success: false, message: 'Failed to update score', error: error.message });
    }
});

// ============================================
// MOCK ANSWERS API (admin only)
// ============================================

app.get('/mock-answers', requireAdmin, async (req, res) => {
    try {
        const { mock, skill } = req.query;
        if (!mock || !skill) {
            return res.status(400).json({ success: false, message: 'Mock number and skill are required' });
        }
        const mockNum = parseInt(mock, 10);
        if (isNaN(mockNum) || mockNum <= 0) {
            return res.status(400).json({ success: false, message: 'Mock number must be a positive integer' });
        }

        const dbClient = await ensureConnection();
        const result = await dbClient.query(
            'SELECT * FROM mock_answers WHERE mock_number = $1 AND skill = $2 ORDER BY question_number',
            [mockNum, skill]
        );

        const answers = {};
        result.rows.forEach(row => {
            const questionKey = skill === 'listening' ? `q${row.question_number}` : `${row.question_number}`;
            let answerValue = row.correct_answer;
            if (row.alternative_answers && row.alternative_answers.length > 0) {
                answerValue = [row.correct_answer, ...row.alternative_answers];
            }
            answers[questionKey] = answerValue;
        });

        res.json({ success: true, answers, count: result.rows.length });
    } catch (error) {
        console.error('❌ Failed to get mock answers:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve answers', error: error.message });
    }
});

app.post('/mock-answers', requireAdmin, async (req, res) => {
    try {
        const { mock, skill, answers } = req.body;
        if (!mock || !skill || !answers) {
            return res.status(400).json({ success: false, message: 'Mock number, skill, and answers are required' });
        }
        const mockNum = parseInt(mock, 10);
        if (isNaN(mockNum) || mockNum <= 0) {
            return res.status(400).json({ success: false, message: 'Mock number must be a positive integer' });
        }
        if (typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > 200) {
            return res.status(400).json({ success: false, message: 'Answers must be an object with at most 200 entries' });
        }
        if (!VALID_IELTS_SKILLS.includes(skill)) {
            return res.status(400).json({ success: false, message: `Invalid skill. Must be one of: ${VALID_IELTS_SKILLS.join(', ')}` });
        }

        const dbClient = await ensureConnection();
        await dbClient.query('BEGIN');

        try {
            await dbClient.query('DELETE FROM mock_answers WHERE mock_number = $1 AND skill = $2', [mockNum, skill]);

            const valueClauses = [];
            const params = [];
            let paramIndex = 1;
            let insertedCount = 0;

            for (const [questionKey, answerValue] of Object.entries(answers)) {
                const questionNumber = parseInt(questionKey.replace(/^q/, ''));
                if (isNaN(questionNumber)) continue;

                let correctAnswer, alternativeAnswers = null;
                if (Array.isArray(answerValue)) {
                    correctAnswer = stripHtmlTags(answerValue[0]);
                    if (answerValue.length > 1) {
                        alternativeAnswers = JSON.stringify(answerValue.slice(1).map(stripHtmlTags));
                    }
                } else {
                    correctAnswer = stripHtmlTags(answerValue);
                }

                valueClauses.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, CURRENT_TIMESTAMP)`);
                params.push(mockNum, skill, questionNumber, correctAnswer, alternativeAnswers);
                paramIndex += 5;
                insertedCount++;
            }

            if (insertedCount > 0) {
                await dbClient.query(
                    `INSERT INTO mock_answers (mock_number, skill, question_number, correct_answer, alternative_answers, updated_at) VALUES ${valueClauses.join(', ')}`,
                    params
                );
            }

            await dbClient.query('COMMIT');
            res.json({ success: true, message: `Saved ${insertedCount} answers for Mock ${mock} - ${skill.toUpperCase()}`, count: insertedCount });
        } catch (error) {
            await dbClient.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('❌ Failed to save mock answers:', error);
        res.status(500).json({ success: false, message: 'Failed to save answers', error: error.message });
    }
});

app.delete('/mock-answers', requireAdmin, async (req, res) => {
    try {
        const { mock, skill } = req.query;
        if (!mock || !skill) {
            return res.status(400).json({ success: false, message: 'Mock number and skill are required' });
        }
        const mockNum = parseInt(mock, 10);
        if (isNaN(mockNum) || mockNum <= 0) {
            return res.status(400).json({ success: false, message: 'Mock number must be a positive integer' });
        }

        const dbClient = await ensureConnection();
        const result = await dbClient.query('DELETE FROM mock_answers WHERE mock_number = $1 AND skill = $2', [mockNum, skill]);
        res.json({ success: true, message: `Deleted ${result.rowCount} answers for Mock ${mock} - ${skill.toUpperCase()}`, count: result.rowCount });
    } catch (error) {
        console.error('❌ Failed to delete mock answers:', error);
        res.status(500).json({ success: false, message: 'Failed to delete answers', error: error.message });
    }
});

// ============================================
// SERVER STARTUP (CJS-specific with license)
// ============================================

async function startServer() {
    try {
        console.log('🚀 Starting local database server...');
        await createDatabaseConnection();

        app.listen(PORT, async () => {
            console.log(`\n🎉 Local Database Server running on http://localhost:${PORT}\n`);
            console.log(`📍 Server: http://localhost:${PORT}`);
            console.log(`🔗 Test connection: http://localhost:${PORT}/test`);
            console.log(`📊 View submissions: http://localhost:${PORT}/submissions\n`);
            console.log('💡 Your tests will now save to the database automatically!');
            console.log('🔄 Database connection will auto-recover if lost!\n');

            console.log('🚀 Launching IELTS Test System...');
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
                }
            } catch (e) {
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
        app.listen(PORT, () => {
            console.log(`\n🎉 Local Database Server running on http://localhost:${PORT} (Database will connect on first request)\n`);
        });
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    if (client) {
        try { await client.end(); } catch (e) { /* ignore */ }
    }
    process.exit(0);
});

startServer();
