// Shared validation helpers for IELTS and Cambridge servers
// ADR-020: Extracted from cambridge-database-server.js to share across both servers

/**
 * Validate a score value (integer, 0-200 range).
 * Returns { valid, error?, value? } where value is the parsed integer.
 */
export function validateScore(score) {
    if (score === null || score === undefined || score === '') {
        return { valid: true };
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

/**
 * Send a standardized error response.
 */
export function errorResponse(res, status, message, error) {
    const body = { success: false, message };
    if (error && error.message) {
        body.error = error.message;
    }
    return res.status(status).json(body);
}
