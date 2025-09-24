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
  // Enable CORS and ensure JSON response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'CORS preflight' });
    return;
  }

  // Allow both GET and POST for easier testing
  if (req.method === 'GET' || req.method === 'POST') {
    try {
      const client = await pool.connect();

      try {
        // Test connection
        const testResult = await client.query('SELECT NOW() as current_time');

        // Create test_submissions table
        await client.query(`
          CREATE TABLE IF NOT EXISTS test_submissions (
            id SERIAL PRIMARY KEY,
            student_id VARCHAR(100) NOT NULL,
            student_name VARCHAR(200) NOT NULL,
            mock_number INTEGER NOT NULL,
            skill VARCHAR(50) NOT NULL CHECK (skill IN ('reading', 'writing', 'listening')),
            answers JSONB NOT NULL,
            score INTEGER CHECK (score >= 0 AND score <= 40),
            band_score VARCHAR(10),
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create indexes
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_test_submissions_student_id ON test_submissions(student_id)
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_test_submissions_skill ON test_submissions(skill)
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_test_submissions_created_at ON test_submissions(created_at)
        `);

        // Create admin_sessions table
        await client.query(`
          CREATE TABLE IF NOT EXISTS admin_sessions (
            id SERIAL PRIMARY KEY,
            session_token VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
            is_active BOOLEAN DEFAULT TRUE
          )
        `);

        // Insert sample data if table is empty
        const countResult = await client.query('SELECT COUNT(*) FROM test_submissions');
        const currentCount = parseInt(countResult.rows[0].count);

        if (currentCount === 0) {
          // Add sample data
          await client.query(`
            INSERT INTO test_submissions
            (student_id, student_name, mock_number, skill, answers, score, band_score, start_time, end_time)
            VALUES
            ('DEMO001', 'Demo Student', 1, 'reading', $1, 32, '7.0', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
            ('DEMO002', 'Sample User', 1, 'writing', $2, NULL, '6.5', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours')
          `, [
            JSON.stringify({
              'q1': 'TRUE',
              'q2': 'FALSE',
              'q3': 'NOT GIVEN',
              'q4': 'technology',
              'q5': 'environment'
            }),
            JSON.stringify({
              'task_1': 'The chart shows population trends over the past decade...',
              'task_2': 'Technology has revolutionized modern education systems...'
            })
          ]);
        }

        // Get final count
        const finalCountResult = await client.query('SELECT COUNT(*) FROM test_submissions');
        const finalCount = parseInt(finalCountResult.rows[0].count);

        res.status(200).json({
          success: true,
          message: 'Database initialized successfully',
          details: {
            connection_time: testResult.rows[0].current_time,
            tables_created: ['test_submissions', 'admin_sessions'],
            total_submissions: finalCount,
            sample_data_added: currentCount === 0 ? 2 : 0
          }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Database initialization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize database',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        details: {
          code: error.code,
          constraint: error.constraint,
          detail: error.detail,
          routine: error.routine
        }
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed. Use GET or POST.`
    });
  }
}