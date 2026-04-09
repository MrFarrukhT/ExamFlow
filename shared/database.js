// Shared database connection management for IELTS and Cambridge servers
import { Client } from 'pg';
import crypto from 'crypto';
import { registerToken } from './auth.js';

export function createDatabaseManager(config) {
    let client = null;
    let isConnecting = false;

    async function createConnection() {
        if (isConnecting) return;
        isConnecting = true;

        try {
            if (client) {
                try { await client.end(); } catch (e) { /* ignore */ }
            }

            client = new Client(config);

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
            await createConnection();
        }
        return client;
    }

    async function shutdown() {
        if (client) {
            try { await client.end(); } catch (e) { /* ignore */ }
        }
    }

    return { createConnection, ensureConnection, shutdown };
}

export function createRetryQueue(ensureConnection, insertFn) {
    const failedSubmissions = [];

    async function backgroundRetry() {
        if (failedSubmissions.length === 0) return;

        console.log(`🔄 Background retry: ${failedSubmissions.length} submissions pending...`);
        const toRetry = [...failedSubmissions];
        failedSubmissions.length = 0;

        for (const submission of toRetry) {
            try {
                const dbClient = await ensureConnection();
                await insertFn(dbClient, submission.data);
            } catch (error) {
                console.log('❌ Background retry failed, will try again in 90s');
                failedSubmissions.push(submission);
            }
        }
    }

    async function saveWithRetry(data, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const dbClient = await ensureConnection();
                return await insertFn(dbClient, data);
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

    // Start background retry every 90 seconds
    // .unref() so this timer doesn't keep the process alive on graceful shutdown
    setInterval(async () => {
        try {
            await backgroundRetry();
        } catch (error) {
            console.error('Background retry error:', error.message);
        }
    }, 90000).unref();

    return { saveWithRetry };
}

export function adminLoginHandler(req, res) {
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
}
