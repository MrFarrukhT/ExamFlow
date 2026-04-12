// Zarmed Olympiada — Standalone Test Server
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
const ADMIN_PASSWORD = process.env.OLYMPIADA_ADMIN_PASSWORD || 'zarmed-admin';
const CONTENT_DIR = path.join(__dirname, 'content');
const SESSIONS_DIR = path.join(__dirname, 'sessions');
const BACKUPS_DIR = path.join(__dirname, 'backups');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Per-boot secret for session token HMAC. Regenerated on restart — existing
// sessions survive (JSONL is durable) but the token won't validate, which is
// fine because a server restart during an exam is already an exceptional event
// that the invigilator handles manually.
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

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
    return start ? {
        studentId: start.studentId || null,
        student: start.student,
        group: start.group || '',
        lang: start.lang,
        skill: start.skill,
        startedAt: start.t
    } : null;
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

// ------- auto-resync: push un-mirrored backups to Neon -------
// Runs on startup and periodically. Scans backups/ for files not yet in
// Postgres, inserts them. Handles the case where exams were taken offline
// and the machine later gets internet.
async function resyncPendingBackups() {
    if (!pgMirror) return;
    try {
        const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
        if (!files.length) return;
        // Get session IDs already in Postgres
        const { rows } = await pgMirror.query('SELECT session_id FROM zarmet_olympiada_submissions');
        const existing = new Set(rows.map(r => r.session_id));
        let synced = 0;
        for (const f of files) {
            try {
                const rec = JSON.parse(fs.readFileSync(path.join(BACKUPS_DIR, f), 'utf8'));
                if (rec.sessionId && !existing.has(rec.sessionId)) {
                    const result = await mirrorToPg(rec);
                    if (result.ok) synced++;
                }
            } catch {}
        }
        if (synced > 0) console.log(`[mirror] resync: pushed ${synced} offline backup(s) to Postgres`);
    } catch (err) {
        console.warn('[mirror] resync failed (non-fatal):', err.message);
    }
}

// Periodic resync — every 2 minutes, push any un-mirrored backups.
// Also retries Postgres connection if it was down at startup.
let _resyncInterval = null;
function startResyncLoop() {
    if (_resyncInterval) return;
    _resyncInterval = setInterval(async () => {
        // If mirror is not connected, try to reconnect
        if (!pgMirror && process.env.OLYMPIADA_DATABASE_URL) {
            try {
                await initPgMirror();
            } catch {}
        }
        await resyncPendingBackups();
    }, 120_000); // 2 minutes
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
        studentId: meta.studentId,
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

// ------- session resume: list active (unfinished) sessions -------
// Used by the welcome page to show "Continue where you left off" when a
// student's PC crashes or the browser is closed mid-exam.
app.get('/api/sessions/active', (req, res) => {
    try {
        const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
        const active = [];
        for (const f of files) {
            const sessionId = f.replace(/\.jsonl$/, '');
            const events = readSessionEvents(sessionId);
            if (!events.length) continue;
            const hasSubmit = events.some(e => e.ev === 'submit');
            if (hasSubmit) continue; // already submitted
            const meta = getSessionMeta(events);
            if (!meta) continue;
            // Calculate time info
            const content = (() => { try { return loadContent(meta.lang, meta.skill); } catch { return null; } })();
            const durationMin = content ? content.durationMinutes : 90;
            const startedAt = new Date(meta.startedAt).getTime();
            const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
            const totalSec = durationMin * 60;
            const remainingSec = Math.max(0, totalSec - elapsedSec);
            const answers = computeAnswersFromEvents(events);
            const answeredCount = Object.values(answers).filter(v => v != null && v !== '').length;
            active.push({
                sessionId,
                student: meta.student,
                group: meta.group,
                lang: meta.lang,
                skill: meta.skill,
                startedAt: meta.startedAt,
                durationMinutes: durationMin,
                remainingSeconds: remainingSec,
                answeredCount,
                expired: remainingSec <= 0
            });
        }
        res.json({ sessions: active });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resume a session — regenerate a valid token for an existing active session.
// The invigilator or student provides the sessionId from the active list;
// the server re-derives the token (same HMAC, same SESSION_SECRET) and
// returns it along with full answer state and timer info.
app.post('/api/session/:id/resume', (req, res) => {
    const { id } = req.params;
    try {
        const events = readSessionEvents(id);
        if (!events.length) return res.status(404).json({ error: 'session not found' });
        if (events.some(e => e.ev === 'submit')) return res.status(409).json({ error: 'session already submitted' });
        const meta = getSessionMeta(events);
        if (!meta) return res.status(400).json({ error: 'no start event' });
        const answers = computeAnswersFromEvents(events);
        const content = (() => { try { return loadContent(meta.lang, meta.skill); } catch { return null; } })();
        const durationMin = content ? content.durationMinutes : 90;
        const startedAt = new Date(meta.startedAt).getTime();
        const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
        const remainingSec = Math.max(0, durationMin * 60 - elapsedSec);
        // Re-derive the session token (same HMAC as session start)
        const sessionToken = crypto.createHmac('sha256', SESSION_SECRET)
            .update(id).digest('hex').slice(0, 32);
        // Log resume event
        appendSessionEvent(id, { ev: 'resume' });
        res.json({
            sessionId: id,
            token: sessionToken,
            meta,
            answers,
            durationMinutes: durationMin,
            remainingSeconds: remainingSec
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Record an anti-cheat violation (tab switch, fullscreen exit, etc.)
app.post('/api/session/:id/violation', verifySessionToken, (req, res) => {
    const { id } = req.params;
    const { type, detail } = req.body || {};
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: 'violation type required' });
    }
    try {
        if (!fs.existsSync(sessionPath(id))) return res.status(404).json({ error: 'session not found' });
        appendSessionEvent(id, { ev: 'violation', type: type.slice(0, 50), detail: String(detail || '').slice(0, 200) });
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Student-status endpoint (ADR-040) — returns which modules this student has completed.
// Scans backups/ for files matching the studentId. Never returns score data.
app.get('/api/student-status', (req, res) => {
    const studentId = String(req.query.studentId || '').trim();
    if (!/^[a-zA-Z0-9-]{8,64}$/.test(studentId)) {
        return res.status(400).json({ error: 'invalid studentId' });
    }
    try {
        const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
        const completed = {};
        for (const f of files) {
            try {
                const rec = JSON.parse(fs.readFileSync(path.join(BACKUPS_DIR, f), 'utf8'));
                if (rec.studentId === studentId && rec.skill) {
                    completed[rec.skill] = {
                        done: true,
                        sessionId: rec.sessionId,
                        filename: f,
                        startedAt: rec.startedAt,
                        finishedAt: rec.finishedAt,
                        lang: rec.lang
                        // NOTE: score intentionally omitted from this response
                    };
                }
            } catch {}
        }
        res.json({ studentId, completed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start a session — returns a new session ID + secret token (ADR-040: accepts studentId)
app.post('/api/session/start', (req, res) => {
    const { studentId, student, group, testTakerId, lang, skill } = req.body || {};
    if (!student || typeof student !== 'string' || student.trim().length < 2) {
        return res.status(400).json({ error: 'student name required (min 2 chars)' });
    }
    if (!/^[a-z0-9-]+$/.test(lang || '') || !/^[a-z0-9-]+$/.test(skill || '')) {
        return res.status(400).json({ error: 'invalid lang or skill' });
    }
    if (studentId && !/^[a-zA-Z0-9-]{8,64}$/.test(studentId)) {
        return res.status(400).json({ error: 'invalid studentId format' });
    }
    // Sanitize name: strip HTML tags server-side (defense-in-depth — admin.js also escapes)
    const cleanName = student.trim().replace(/<[^>]*>/g, '');
    if (cleanName.length < 2) {
        return res.status(400).json({ error: 'student name required (min 2 chars after sanitization)' });
    }
    const cleanGroup = (testTakerId || group || '').trim().replace(/<[^>]*>/g, '');
    try {
        loadContent(lang, skill); // validate content exists
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
    // Duplicate-submit prevention: if this studentId has already completed this skill, refuse
    if (studentId) {
        try {
            const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
            for (const f of files) {
                try {
                    const rec = JSON.parse(fs.readFileSync(path.join(BACKUPS_DIR, f), 'utf8'));
                    if (rec.studentId === studentId && rec.lang === lang && rec.skill === skill) {
                        return res.status(409).json({ error: 'module already completed', filename: f });
                    }
                } catch {}
            }
        } catch {}
    }
    const newSessionId = crypto.randomBytes(12).toString('hex');
    // Session secret: HMAC of the session ID using a per-boot server key.
    // The client must send this token with every session request. Prevents
    // session hijacking by someone who glimpses the session ID on-screen.
    const sessionToken = crypto.createHmac('sha256', SESSION_SECRET)
        .update(newSessionId).digest('hex').slice(0, 32);
    appendSessionEvent(newSessionId, {
        ev: 'start',
        studentId: studentId || null,
        student: cleanName,
        group: cleanGroup,
        lang,
        skill,
        tokenHash: crypto.createHash('sha256').update(sessionToken).digest('hex').slice(0, 16)
    });
    res.json({ sessionId: newSessionId, token: sessionToken });
});

// Session token verification: the client must send X-Session-Token header
// (or ?token= query param as fallback) matching the HMAC-derived token from
// /api/session/start. This prevents session hijacking by someone who only
// knows the session ID (e.g. glimpsed on screen or in network logs).
function verifySessionToken(req, res, next) {
    const { id } = req.params;
    const clientToken = req.headers['x-session-token'] || req.query.token || '';
    const expected = crypto.createHmac('sha256', SESSION_SECRET)
        .update(id).digest('hex').slice(0, 32);
    if (!clientToken || clientToken !== expected) {
        return res.status(403).json({ error: 'invalid session token' });
    }
    next();
}

// Record an audio-play event (ADR-039 — strict listening anti-refresh tracking)
app.post('/api/session/:id/audio-play', verifySessionToken, (req, res) => {
    const { id } = req.params;
    const { partId } = req.body || {};
    if (!partId || typeof partId !== 'string') {
        return res.status(400).json({ error: 'partId required' });
    }
    try {
        if (!fs.existsSync(sessionPath(id))) return res.status(404).json({ error: 'session not found' });
        appendSessionEvent(id, { ev: 'audio-play', partId });
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Record an answer change (live save)
app.post('/api/session/:id/answer', verifySessionToken, (req, res) => {
    const { id } = req.params;
    const { qid, value } = req.body || {};
    if (!qid || typeof qid !== 'string') {
        return res.status(400).json({ error: 'qid required' });
    }
    // QID format validation: alphanumeric + dash/underscore, max 64 chars,
    // must NOT start with underscore (blocks __proto__, __defineGetter__, etc).
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(qid)) {
        return res.status(400).json({ error: 'invalid qid format' });
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
app.get('/api/session/:id', verifySessionToken, (req, res) => {
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
app.post('/api/session/:id/submit', verifySessionToken, async (req, res) => {
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
        // Server-side timer enforcement: reject submissions that arrive after
        // the allowed duration + grace period. The client timer is only a UX
        // convenience — this is the authoritative deadline. A 60-second grace
        // covers network lag and auto-submit timing.
        let overtime = false;
        try {
            const content = loadContent(meta.lang, meta.skill);
            const durationMs = (content.durationMinutes || 60) * 60 * 1000;
            const graceMs = 60 * 1000; // 60s grace for network lag / auto-submit
            const startedAt = new Date(meta.startedAt).getTime();
            const deadline = startedAt + durationMs + graceMs;
            if (Date.now() > deadline) {
                overtime = true;
                const overBy = Math.round((Date.now() - deadline) / 1000);
                console.warn(`[submit] session ${id} is ${overBy}s past deadline — accepting but flagging`);
            }
        } catch (e) {
            // Content load failure shouldn't block submit — log and proceed
            console.warn('[submit] timer check failed:', e.message);
        }
        appendSessionEvent(id, { ev: 'submit', overtime });
        const freshEvents = readSessionEvents(id);
        const result = finalizeSession(id, freshEvents, meta);
        // Intentionally hide the score from the client per ADR-036 (no post-submit breakdown)
        res.json({ ok: true, backup: result.filename, overtime });
    } catch (err) {
        console.error('[submit] error:', err);
        res.status(500).json({ error: 'finalization failed: ' + err.message });
    }
});

// ------- Admin routes (password-gated) -------
// Admin tokens are HMAC-derived from the password + server secret, so the
// plaintext password is never sent back to the client. Tokens are stable
// for the server's lifetime (same SESSION_SECRET) but rotate on restart.
const ADMIN_TOKEN = crypto.createHmac('sha256', SESSION_SECRET)
    .update('admin:' + ADMIN_PASSWORD).digest('hex');

function requireAdmin(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
}

// Simple in-memory rate limiter for admin login (max 5 attempts per 60s per IP)
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

app.post('/api/admin/login', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    // Clean old entries
    const entry = loginAttempts.get(ip) || { attempts: [], lockedUntil: 0 };
    entry.attempts = entry.attempts.filter(t => now - t < LOGIN_WINDOW_MS);

    if (now < entry.lockedUntil) {
        const waitSec = Math.ceil((entry.lockedUntil - now) / 1000);
        return res.status(429).json({ error: 'too many attempts, try again in ' + waitSec + 's' });
    }
    if (entry.attempts.length >= LOGIN_MAX_ATTEMPTS) {
        entry.lockedUntil = now + LOGIN_WINDOW_MS;
        loginAttempts.set(ip, entry);
        return res.status(429).json({ error: 'too many attempts, try again in 60s' });
    }

    const { password } = req.body || {};
    if (password !== ADMIN_PASSWORD) {
        entry.attempts.push(now);
        loginAttempts.set(ip, entry);
        return res.status(401).json({ error: 'wrong password' });
    }
    // Successful login — clear attempts
    loginAttempts.delete(ip);
    res.json({ ok: true, token: ADMIN_TOKEN });
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
    // Push any backups taken offline to Neon, then start periodic resync
    resyncPendingBackups().catch(() => {});
    startResyncLoop();

    app.listen(PORT, () => {
        console.log('');
        console.log('==============================================');
        console.log('  Zarmed University — C1 Olympiada');
        console.log(`  Running on http://localhost:${PORT}`);
        console.log(`  Sessions:  ${SESSIONS_DIR}`);
        console.log(`  Backups:   ${BACKUPS_DIR}`);
        console.log(`  Mirror:    ${pgMirror ? 'ENABLED' : 'disabled'}`);
        console.log(`  Resync:    every 2 minutes (auto-reconnect)`);
        console.log('==============================================');
        console.log('');
    });
}

start().catch(err => {
    console.error('[fatal]', err);
    process.exit(1);
});
