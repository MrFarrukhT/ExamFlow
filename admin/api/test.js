import { Pool } from 'pg';

// Database connection using Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Test database connection
      const client = await pool.connect();

      try {
        const result = await client.query('SELECT NOW() as current_time, version()');

        res.status(200).json({
          success: true,
          message: 'Database connection successful',
          timestamp: result.rows[0].current_time,
          database_version: result.rows[0].version,
          environment: {
            nodeVersion: process.version,
            platform: process.platform
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error.message,
        details: {
          code: error.code,
          errno: error.errno,
          syscall: error.syscall
        }
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}