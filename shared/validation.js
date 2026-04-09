// Shared validation helpers for IELTS and Cambridge servers
// ADR-020: Extracted from cambridge-database-server.js to share across both servers

/**
 * Validate a score value (integer, 0-100 range).
 * Returns { valid, error?, value? } where value is the parsed integer.
 *
 * Range note: 100 is a safety net, NOT a per-skill cap. Real Cambridge raw maxes
 * top out around 90 (C1-Advanced); IELTS raw is 0-40. R27 lowered the upper bound
 * from 200 → 100 because admin /cambridge-submissions/:id/score was accepting 200
 * for B2-First reading (real max ≈ 75), enabling fraudulent grading. The endpoint
 * SHOULD enforce a per-level/skill cap on top of this; this function only catches
 * the most egregious values.
 */
export function validateScore(score) {
    if (score === null || score === undefined || score === '') {
        return { valid: true };
    }
    const parsed = Number(score);
    if (!Number.isInteger(parsed)) {
        return { valid: false, error: 'Score must be an integer' };
    }
    if (parsed < 0 || parsed > 100) {
        return { valid: false, error: 'Score must be between 0 and 100' };
    }
    return { valid: true, value: parsed };
}

/**
 * Validate a grade string (alphanumeric, spaces, hyphens; max 20 chars).
 */
export function validateGrade(grade) {
    if (grade === null || grade === undefined || grade === '') {
        return { valid: true };
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
 * Validate score and grade together.
 * Returns a { success: false, message } error object, or null if valid.
 */
export function validateScoreAndGrade(score, grade) {
    const scoreResult = validateScore(score);
    if (!scoreResult.valid) {
        return { success: false, message: scoreResult.error };
    }
    const gradeResult = validateGrade(grade);
    if (!gradeResult.valid) {
        return { success: false, message: gradeResult.error };
    }
    return null;
}

/**
 * Validate student ID and name (required, trimmed, max 200 chars).
 * Strips null bytes and control characters that break PostgreSQL UTF8 storage
 * or enable header injection.
 * Returns { valid, studentId?, studentName?, error? }.
 */
export function validateStudentInfo(studentId, studentName) {
    // Strip null bytes and control chars (except tab/newline which are usually trimmed)
    const sanitize = (s) => typeof s === 'string'
        ? s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
        : '';
    const id = sanitize(studentId);
    const name = sanitize(studentName);
    if (!id || !name) {
        return { valid: false, error: 'Student ID and name are required' };
    }
    if (id.length > 200 || name.length > 200) {
        return { valid: false, error: 'Student ID and name must be at most 200 characters' };
    }
    return { valid: true, studentId: id, studentName: name };
}

/**
 * Strip HTML tags from a string to prevent stored XSS.
 */
export function stripHtmlTags(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '');
}

// Schema for known anti-cheat fields. Enforces type at the server boundary so
// the dashboard violation logic (which uses loose type checks) can't be bypassed
// by submitting non-numeric counters or non-boolean flags.
//
// counters: must coerce to non-negative integer (else dropped)
// booleans: must be a boolean (else dropped)
// dates:    must be a parseable ISO date string (else dropped)
// Anything not in the schema falls through to generic sanitization.
const ANTI_CHEAT_SCHEMA = {
    tabSwitches: 'counter',
    windowBlurs: 'counter',
    fullscreenExits: 'counter',
    copyAttempts: 'counter',
    pasteAttempts: 'counter',
    rightClickAttempts: 'counter',
    blockedShortcuts: 'counter',
    distractionFreeEnabled: 'boolean',
    durationFlag: 'boolean',
    firstViolationAt: 'date',
    lastViolationAt: 'date'
};

function coerceSchemaValue(key, value) {
    const type = ANTI_CHEAT_SCHEMA[key];
    if (!type) return undefined; // unknown field — let generic path handle it
    if (type === 'counter') {
        // Must be a finite non-negative integer
        if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
            return null; // drop
        }
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

/**
 * Sanitize and bound a client-supplied anti-cheat metadata object.
 *
 * - Schema-driven type enforcement on known anti-cheat fields (defeats type confusion
 *   bypasses against dashboard violation logic)
 * - Strips HTML tags from string values (prevents stored XSS)
 * - Caps total serialized size at MAX_BYTES (prevents DoS via massive payloads)
 * - Drops nested objects deeper than MAX_DEPTH (prevents pathological structures)
 * - Removes server-managed keys (caller will set those server-side after this returns)
 *
 * Returns null if input is not a plain object or if the sanitized result is empty.
 */
export function sanitizeAntiCheat(input, serverManagedKeys = []) {
    if (input == null || typeof input !== 'object' || Array.isArray(input)) return null;
    const MAX_DEPTH = 4;
    const MAX_KEYS = 50;
    const MAX_STRING = 500;
    const MAX_BYTES = 4096; // 4KB serialized cap

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
                if (serverManagedKeys.includes(key)) continue;
                const cleaned = clean(value[key], depth + 1);
                if (cleaned !== null) {
                    out[key] = cleaned;
                    count++;
                }
            }
            return out;
        }
        return null;
    }

    // Top-level pass: schema-enforced for known keys, generic clean for unknown
    const out = {};
    let count = 0;
    for (const key of Object.keys(input)) {
        if (count >= MAX_KEYS) break;
        if (serverManagedKeys.includes(key)) continue;
        if (key in ANTI_CHEAT_SCHEMA) {
            const coerced = coerceSchemaValue(key, input[key]);
            if (coerced !== null && coerced !== undefined) {
                out[key] = coerced;
                count++;
            }
            // type mismatch on known field → silently drop
            continue;
        }
        const cleaned = clean(input[key], 1);
        if (cleaned !== null) {
            out[key] = cleaned;
            count++;
        }
    }

    if (Object.keys(out).length === 0) return null;
    // Enforce total size cap by serializing
    const json = JSON.stringify(out);
    if (json.length > MAX_BYTES) return null;
    return out;
}

