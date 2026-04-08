// Shared server bootstrap — common Express setup for IELTS and Cambridge servers
// ADR-012: Extracted to eliminate duplicated boilerplate

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDatabaseManager, adminLoginHandler } from './database.js';

/**
 * Create a configured Express server with database, middleware, and lifecycle hooks.
 *
 * @param {object} opts
 * @param {number} opts.port           — listen port
 * @param {string} opts.name           — display name for logs (e.g. "IELTS Server")
 * @param {string} opts.callerUrl      — import.meta.url from the calling module
 * @param {object} opts.dbConfig       — passed to createDatabaseManager
 * @param {function} [opts.onReady]    — optional async callback after app.listen()
 * @returns {{ app: express.Application, db: object, ensureConnection: function, __dirname: string }}
 */
export function createServer({ port, name, callerUrl, dbConfig, onReady }) {
    const __filename = fileURLToPath(callerUrl);
    const callerDirname = path.dirname(__filename);

    const app = express();

    // Database connection using shared module
    const db = createDatabaseManager(dbConfig);
    const { ensureConnection } = db;

    // --- Middleware ---
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Block access to sensitive files before static middleware
    const blockedPaths = [
        /^\/\.git(\/|$)/,
        /^\/\.claude(\/|$)/,
        /^\/\.env/,
        /^\/\.scenario-cursor\.json$/,
        /^\/node_modules(\/|$)/,
        /^\/shared(\/|$)/,
        /^\/package(-lock)?\.json$/,
        /^\/(local-database-server|cambridge-database-server|server-bundled|keygen)\.js$/,
    ];
    app.use((req, res, next) => {
        if (blockedPaths.some(re => re.test(req.path))) {
            return res.status(404).send('Not found');
        }
        next();
    });

    // Serve static files — handle both local dev and packaged (pkg) environment
    if (process.pkg) {
        app.use(express.static(path.join(callerDirname, 'public')));
        app.use(express.static(callerDirname));
    } else {
        app.use(express.static('./'));
    }

    // Admin login endpoint
    app.post('/admin-login', adminLoginHandler);

    // --- Lifecycle helpers ---

    async function start() {
        try {
            console.log(`🚀 Starting ${name}...`);
            await db.createConnection();
        } catch (error) {
            console.error(`❌ Failed to initialize ${name}:`, error.message);
            console.log('⚠️ Server will start anyway, database will connect on first request');
        }

        return new Promise((resolve) => {
            app.listen(port, async () => {
                console.log(`\n🎉 ${name} running on http://localhost:${port}\n`);

                if (onReady) {
                    try {
                        await onReady({ app, db, ensureConnection, port });
                    } catch (err) {
                        console.error('⚠️ onReady callback error:', err.message);
                    }
                }

                resolve();
            });
        });
    }

    // Graceful shutdown
    function registerShutdown() {
        const shutdown = async () => {
            console.log(`\n🛑 Shutting down ${name}...`);
            await db.shutdown();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    registerShutdown();

    return { app, db, ensureConnection, __dirname: callerDirname, start };
}
