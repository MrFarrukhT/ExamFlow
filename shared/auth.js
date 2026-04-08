// Shared admin authentication middleware
// Validates admin tokens on protected endpoints

const validTokens = new Set();

/**
 * Register a token as valid (called after successful admin login).
 */
export function registerToken(token) {
    validTokens.add(token);
}

/**
 * Remove a token (called on logout or expiry).
 */
export function removeToken(token) {
    validTokens.delete(token);
}

/**
 * Express middleware — requires a valid admin token in the Authorization header.
 * Format: Authorization: Bearer <token>
 */
export function requireAdmin(req, res, next) {
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

/**
 * Simple in-memory rate limiter per IP.
 * Returns middleware that allows `maxRequests` per `windowMs` milliseconds.
 */
export function rateLimit({ windowMs = 60000, maxRequests = 30, message = 'Too many requests' } = {}) {
    const hits = new Map(); // ip -> { count, resetTime }

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
