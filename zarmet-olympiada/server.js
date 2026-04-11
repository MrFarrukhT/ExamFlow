// Zarmet Olympiada — Standalone Test Server
// ADR-033 + ADR-035. Keep this file under ~500 lines. If it grows, extract modules.
//
// Durability model: append-only JSONL per session + atomic final JSON on submit.
// Optional Postgres mirror if OLYMPIADA_DATABASE_URL is set. See ADR-035.

import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.OLYMPIADA_PORT || 3004);
const ADMIN_PASSWORD = process.env.OLYMPIADA_ADMIN_PASSWORD || 'zarmet-admin';
const CONTENT_DIR = path.join(__dirname, 'content');
const SESSIONS_DIR = path.join(__dirname, 'sessions');
const BACKUPS_DIR = path.join(__dirname, 'backups');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ------- bootstrap folders -------
for (const dir of [SESSIONS_DIR, BACKUPS_DIR, path.join(SESSIONS_DIR, '_completed')]) {
    fs.mkdirSync(dir, { recursive: true });
}

// ------- content loading (with validation) -------
const contentCache = new Map();

// Canonical iterator: yields every question in a part, whether the part uses
// the flat `questions` array or the `taskGroups[*].questions` shape (ADR-038).
// This is the ONE place that knows about both shapes; all scoring/validation
// code must use this helper.
function* walkPartQuestions(part) {
    if (Array.isArray(part.taskGroups) && part.taskGroups.length > 0) {
        for (const tg of part.taskGroups) {
            for (const q of (tg.questions || [])) yield q;
        }
    } else {
        for (const q of (part.questions || [])) yield q;
    }
}

function loadContent(lang, skill) {
    const cacheKey = `${lang}/${skill}`;
    if (contentCache.has(cacheKey)) return contentCache.get(cacheKey);

    const filePath = path.join(CONTENT_DIR, lang, `${skill}.json`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Content not found: ${cacheKey}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const content = JSON.parse(raw);

    // Validate required fields
    const required = ['id', 'language', 'level', 'skill', 'title', 'durationMinutes', 'parts', 'scoring'];
    for (const field of required) {
        if (content[field] === undefined) {
            throw new Error(`Content ${cacheKey} missing required field: ${field}`);
        }
    }

    // Collect all question IDs for uniqueness + totalPoints cross-check
    const seenQids = new Set();
    let computedTotal = 0;
    for (const part of content.parts) {
        if (!part.id || !part.title) {
            throw new Error(`Content ${cacheKey} part malformed: ${JSON.stringify(part.id)}`);
        }
        // A part must have either flat `questions` OR `taskGroups`, not both, not neither
        const hasFlat = Array.isArray(part.questions) && part.questions.length > 0;
        const hasGroups = Array.isArray(part.taskGroups) && part.taskGroups.length > 0;
        if (hasFlat && hasGroups) {
            throw new Error(`Content ${cacheKey} part ${part.id} has BOTH questions and taskGroups (mutually exclusive)`);
        }
        if (!hasFlat && !hasGroups) {
            throw new Error(`Content ${cacheKey} part ${part.id} has neither questions nor taskGroups`);
        }
        // gapped-text parts require a paragraphBank
        if (hasFlat && part.questions.some(q => q.type === 'gapped-text')) {
            if (!Array.isArray(part.paragraphBank) || part.paragraphBank.length === 0) {
                throw new Error(`Content ${cacheKey} part ${part.id} uses gapped-text but has no paragraphBank`);
            }
        }
        for (const q of walkPartQuestions(part)) {
            if (!q.id || !q.type) {
                throw new Error(`Content ${cacheKey} question malformed in part ${part.id}`);
            }
            if (seenQids.has(q.id)) {
                throw new Error(`Content ${cacheKey} duplicate question id: ${q.id}`);
            }
            seenQids.add(q.id);
            computedTotal += q.points ?? 1;
        }
    }
    if (content.scoring.totalPoints !== computedTotal) {
        console.warn(`[content] ${cacheKey} scoring.totalPoints=${content.scoring.totalPoints} but computed=${computedTotal}`);
    }

    contentCache.set(cacheKey, content);
    console.log(`[content] loaded ${cacheKey} — ${seenQids.size} questions, ${computedTotal} points`);
    return content;
}

// Deep clone + strip answer fields before sending to client. Walks both
// flat `questions` and `taskGroups[*].questions` (ADR-038).
function stripAnswerKey(content) {
    const clone = JSON.parse(JSON.stringify(content));
    if (clone.scoring) delete clone.scoring.totalPoints;
    for (const part of clone.parts || []) {
        for (const q of (part.questions || [])) {
            delete q.answer;
            delete q.points;
        }
        for (const tg of (part.taskGroups || [])) {
            for (const q of (tg.questions || [])) {
                delete q.answer;
                delete q.points;
            }
        }
    }
    return clone;
}

// ------- scoring -------
function scoreAnswer(question, studentValue) {
    if (studentValue == null || studentValue === '') return 0;
    const points = question.points ?? 1;
    const t = question.type;

    if (t === 'multiple-choice' || t === 'matching' || t === 'true-false' || t === 'gapped-text') {
        return String(studentValue).trim() === String(question.answer).trim() ? points : 0;
    }

    if (t === 'multiple-choice-multi') {
        const want = new Set((question.answer || []).map(String));
        const got = new Set((Array.isArray(studentValue) ? studentValue : [studentValue]).map(String));
        if (want.size !== got.size) return 0;
        for (const k of want) if (!got.has(k)) return 0;
        return points;
    }

    if (t === 'gap-fill' || t === 'open-cloze' || t === 'word-formation' || t === 'sentence-completion') {
        const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
        const caseSensitive = question.caseSensitive === true;
        const sv = caseSensitive ? String(studentValue).trim() : String(studentValue).trim().toLowerCase();
        for (const ans of accepted) {
            const a = caseSensitive ? String(ans).trim() : String(ans).trim().toLowerCase();
            if (sv === a) return points;
        }
        return 0;
    }

    if (t === 'key-word-transformation') {
        const ans = question.answer || {};
        const sv = String(studentValue).trim().toLowerCase();
        const wordCount = sv.split(/\s+/).filter(Boolean).length;
        if (ans.maxWords && wordCount > ans.maxWords) return 0;
        const candidates = [ans.required, ...(ans.alternatives || [])].filter(Boolean);
        for (const seq of candidates) {
            const joined = seq.join(' ').toLowerCase();
            if (sv.includes(joined)) return points;
        }
        return 0;
    }

    // Unknown types fail closed
    console.warn(`[score] unknown question type ${t} for ${question.id}`);
    return 0;
}

function scoreSubmission(content, answers) {
    let earned = 0;
    let total = 0;
    const perQuestion = [];
    for (const part of content.parts) {
        for (const q of walkPartQuestions(part)) {
            const studentValue = answers[q.id];
            const points = q.points ?? 1;
            const earnedHere = scoreAnswer(q, studentValue);
            earned += earnedHere;
            total += points;
            perQuestion.push({
                qid: q.id,
                partId: part.id,
                type: q.type,
                studentValue: studentValue ?? null,
                correctAnswer: q.answer,
                earned: earnedHere,
                possible: points
            });
        }
    }
    return { earned, total, perQuestion };
}

// ------- session storage (JSONL append-only) -------
function sessionPath(sessionId) {
    // Sanitize: only allow alphanumeric + dash
    const safe = String(sessionId).replace(/[^a-zA-Z0-9-]/g, '');
    if (!safe || safe.length > 64) throw new Error('invalid session id');
    return path.join(SESSIONS_DIR, `${safe}.jsonl`);
}

function appendSessionEvent(sessionId, event) {
    const line = JSON.stringify({ t: new Date().toISOString(), ...event }) + '\n';
    fs.appendFileSync(sessionPath(sessionId), line, 'utf8');
}

function readSessionEvents(sessionId) {
    const p = sessionPath(sessionId);
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => { try { return JSON.parse(line); } catch { return null; } })
        .filter(Boolean);
}

function computeAnswersFromEvents(events) {
    const answers = {};
    for (const ev of events) {
        if (ev.ev === 'answer' && ev.qid) {
            answers[ev.qid] = ev.value;
        }
    }
    return answers;
}

function getSessionMeta(events) {
    const start = events.find(e => e.ev === 'start');
    return start ? { student: start.student, group: start.group || '', lang: start.lang, skill: start.skill, startedAt: start.t } : null;
}

// ------- atomic final JSON backup -------
function sanitizeFilename(s) {
    return String(s).replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 40);
}

function writeBackupAtomic(record) {
    const ts = record.startedAt.slice(0, 10);
    const name = sanitizeFilename(record.student || 'unknown');
    const filename = `${ts}_${name}_${record.lang}_${record.skill}_${record.sessionId}.json`;
    const finalPath = path.join(BACKUPS_DIR, filename);
    const tmpPath = finalPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(record, null, 2), 'utf8');
    fs.renameSync(tmpPath, finalPath);
    return filename;
}

// ------- optional Postgres mirror (best-effort) -------
let pgMirror = null;
async function initPgMirror() {
    if (!process.env.OLYMPIADA_DATABASE_URL) {
        console.log('[mirror] OLYMPIADA_DATABASE_URL not set — Postgres mirror disabled');
        return;
    }
    try {
        const { default: pg } = await import('pg');
        pgMirror = new pg.Pool({
            connectionString: process.env.OLYMPIADA_DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        await pgMirror.query(`
            CREATE TABLE IF NOT EXISTS zarmet_olympiada_submissions (
                id SERIAL PRIMARY KEY,
                session_id TEXT UNIQUE NOT NULL,
                student TEXT NOT NULL,
                student_group TEXT,
                language TEXT NOT NULL,
                skill TEXT NOT NULL,
                started_at TIMESTAMPTZ NOT NULL,
                finished_at TIMESTAMPTZ NOT NULL,
                earned_points INTEGER NOT NULL,
                total_points INTEGER NOT NULL,
                record JSONB NOT NULL
            )
        `);
        console.log('[mirror] Postgres mirror ready');
    } catch (err) {
        console.warn('[mirror] failed to init Postgres mirror (non-fatal):', err.message);
        pgMirror = null;
    }
}

async function mirrorToPg(record) {
    if (!pgMirror) return { ok: false, reason: 'disabled' };
    try {
        await pgMirror.query(
            `INSERT INTO zarmet_olympiada_submissions
                (session_id, student, student_group, language, skill, started_at, finished_at, earned_points, total_points, record)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (session_id) DO NOTHING`,
            [
                record.sessionId,
                record.student,
                record.group,
                record.lang,
                record.skill,
                record.startedAt,
                record.finishedAt,
                record.score.earned,
                record.score.total,
                record
            ]
        );
        return { ok: true };
    } catch (err) {
        console.warn('[mirror] insert failed (non-fatal):', err.message);
        return { ok: false, reason: err.message };
    }
}

// ------- crash recovery -------
function recoverIncompleteSessions() {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
        const sessionId = file.replace(/\.jsonl$/, '');
        const events = readSessionEvents(sessionId);
        const hasSubmit = events.some(e => e.ev === 'submit');
        const meta = getSessionMeta(events);
        if (hasSubmit && meta) {
            // Check if backup exists for this session
            const existing = fs.readdirSync(BACKUPS_DIR).find(f => f.includes(sessionId));
            if (!existing) {
                console.log(`[recover] finalizing unfinished submit for session ${sessionId}`);
                try {
                    finalizeSession(sessionId, events, meta);
                } catch (err) {
                    console.error(`[recover] failed to finalize ${sessionId}:`, err.message);
                }
            }
        }
    }
}

function finalizeSession(sessionId, events, meta) {
    const answers = computeAnswersFromEvents(events);
    const content = loadContent(meta.lang, meta.skill);
    const score = scoreSubmission(content, answers);
    const submitEv = events.find(e => e.ev === 'submit');
    const record = {
        sessionId,
        student: meta.student,
        group: meta.group,
        lang: meta.lang,
        skill: meta.skill,
        startedAt: meta.startedAt,
        finishedAt: submitEv ? submitEv.t : new Date().toISOString(),
        answers,
        score,
        eventCount: events.length
    };
    const filename = writeBackupAtomic(record);
    // Move the JSONL to _completed
    try {
        fs.renameSync(sessionPath(sessionId), path.join(SESSIONS_DIR, '_completed', `${sessionId}.jsonl`));
    } catch { /* ignore */ }
    // Best-effort mirror (fire and forget)
    mirrorToPg(record).catch(() => {});
    return { filename, record };
}

// ------- Express app -------
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        port: PORT,
        mirror: !!pgMirror,
        contentLoaded: Array.from(contentCache.keys())
    });
});

// Content route — always strips answer keys
app.get('/api/content/:lang/:skill', (req, res) => {
    try {
        const { lang, skill } = req.params;
        if (!/^[a-z0-9-]+$/.test(lang) || !/^[a-z0-9-]+$/.test(skill)) {
            return res.status(400).json({ error: 'invalid params' });
        }
        const content = loadContent(lang, skill);
        res.json(stripAnswerKey(content));
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// Audio file serving (simple static under content/{lang}/audio)
app.get('/api/audio/:lang/:filename', (req, res) => {
    const { lang, filename } = req.params;
    if (!/^[a-z0-9-]+$/.test(lang) || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return res.status(400).json({ error: 'invalid params' });
    }
    const filePath = path.join(CONTENT_DIR, lang, 'audio', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'not found' });
    res.sendFile(filePath);
});

// Start a session — returns a new session ID
app.post('/api/session/start', (req, res) => {
    const { student, group, lang, skill } = req.body || {};
    if (!student || typeof student !== 'string' || student.trim().length < 2) {
        return res.status(400).json({ error: 'student name required (min 2 chars)' });
    }
    if (!/^[a-z0-9-]+$/.test(lang || '') || !/^[a-z0-9-]+$/.test(skill || '')) {
        return res.status(400).json({ error: 'invalid lang or skill' });
    }
    try {
        loadContent(lang, skill); // validate content exists
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
    const sessionId = crypto.randomBytes(12).toString('hex');
    appendSessionEvent(sessionId, { ev: 'start', student: student.trim(), group: (group || '').trim(), lang, skill });
    res.json({ sessionId });
});

// Record an answer change (live save)
app.post('/api/session/:id/answer', (req, res) => {
    const { id } = req.params;
    const { qid, value } = req.body || {};
    if (!qid || typeof qid !== 'string') {
        return res.status(400).json({ error: 'qid required' });
    }
    try {
        if (!fs.existsSync(sessionPath(id))) return res.status(404).json({ error: 'session not found' });
        appendSessionEvent(id, { ev: 'answer', qid, value });
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Resume a session — return student meta and current answer state
app.get('/api/session/:id', (req, res) => {
    const { id } = req.params;
    try {
        const events = readSessionEvents(id);
        if (!events.length) return res.status(404).json({ error: 'session not found' });
        const meta = getSessionMeta(events);
        const answers = computeAnswersFromEvents(events);
        res.json({ meta, answers });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Submit — finalizes the session
app.post('/api/session/:id/submit', async (req, res) => {
    const { id } = req.params;
    try {
        const events = readSessionEvents(id);
        if (!events.length) return res.status(404).json({ error: 'session not found' });
        const meta = getSessionMeta(events);
        if (!meta) return res.status(400).json({ error: 'session has no start event' });
        // Check for duplicate submit
        if (events.some(e => e.ev === 'submit')) {
            return res.status(409).json({ error: 'session already submitted' });
        }
        appendSessionEvent(id, { ev: 'submit' });
        const freshEvents = readSessionEvents(id);
        const result = finalizeSession(id, freshEvents, meta);
        // Intentionally hide the score from the client per ADR-036 (no post-submit breakdown)
        res.json({ ok: true, backup: result.filename });
    } catch (err) {
        console.error('[submit] error:', err);
        res.status(500).json({ error: 'finalization failed: ' + err.message });
    }
});

// ------- Admin routes (password-gated) -------
function requireAdmin(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (token !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
}

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body || {};
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'wrong password' });
    }
    res.json({ ok: true, token: ADMIN_PASSWORD });
});

app.get('/api/admin/submissions', requireAdmin, (req, res) => {
    try {
        const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
        const rows = files.map(f => {
            try {
                const record = JSON.parse(fs.readFileSync(path.join(BACKUPS_DIR, f), 'utf8'));
                return {
                    filename: f,
                    sessionId: record.sessionId,
                    student: record.student,
                    group: record.group,
                    lang: record.lang,
                    skill: record.skill,
                    startedAt: record.startedAt,
                    finishedAt: record.finishedAt,
                    earned: record.score?.earned ?? 0,
                    total: record.score?.total ?? 0
                };
            } catch {
                return { filename: f, error: 'parse failed' };
            }
        });
        rows.sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''));
        res.json({ rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/submission/:filename', requireAdmin, (req, res) => {
    const { filename } = req.params;
    if (!/^[a-zA-Z0-9._-]+\.json$/.test(filename)) {
        return res.status(400).json({ error: 'invalid filename' });
    }
    const p = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(p)) return res.status(404).json({ error: 'not found' });
    res.sendFile(p);
});

// ------- error handler -------
app.use((err, req, res, next) => {
    console.error('[server] unhandled:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'server error' });
});

// ------- startup -------
async function start() {
    // Pre-load and validate all content files
    const langs = ['english-c1', 'german-c1'];
    const skills = ['reading', 'listening'];
    for (const lang of langs) {
        for (const skill of skills) {
            try {
                loadContent(lang, skill);
            } catch (err) {
                console.error(`[content] FAILED to load ${lang}/${skill}:`, err.message);
            }
        }
    }

    await initPgMirror();
    recoverIncompleteSessions();

    app.listen(PORT, () => {
        console.log('');
        console.log('==============================================');
        console.log('  Zarmet University — C1 Olympiada');
        console.log(`  Running on http://localhost:${PORT}`);
        console.log(`  Sessions:  ${SESSIONS_DIR}`);
        console.log(`  Backups:   ${BACKUPS_DIR}`);
        console.log(`  Mirror:    ${pgMirror ? 'ENABLED' : 'disabled'}`);
        console.log('==============================================');
        console.log('');
    });
}

start().catch(err => {
    console.error('[fatal]', err);
    process.exit(1);
});
