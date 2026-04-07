const { Pool } = require('pg');

// Database connection using Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create test_submissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_submissions (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        student_name VARCHAR(200) NOT NULL,
        mock_number INTEGER NOT NULL,
        skill VARCHAR(50) NOT NULL,
        answers JSONB NOT NULL,
        score INTEGER,
        band_score VARCHAR(10),
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'http://localhost:3002');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize database on first request
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Database initialization error:', error);
  }

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();

      try {
        // Get all test submissions
        const result = await client.query(`
          SELECT
            id,
            student_id,
            student_name,
            mock_number,
            skill,
            score,
            band_score,
            start_time,
            end_time,
            created_at,
            answers
          FROM test_submissions
          ORDER BY created_at DESC
        `);

        res.status(200).json({
          success: true,
          submissions: result.rows
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submissions',
        error: error.message
      });
    }
  }

  else if (req.method === 'POST') {
    try {
      const {
        studentId,
        studentName,
        mockNumber,
        skill,
        answers,
        score,
        bandScore,
        startTime,
        endTime
      } = req.body;

      if (!studentId || !studentName || !mockNumber || !skill || !answers) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const client = await pool.connect();

      try {
        const result = await client.query(`
          INSERT INTO test_submissions
          (student_id, student_name, mock_number, skill, answers, score, band_score, start_time, end_time)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [studentId, studentName, mockNumber, skill, JSON.stringify(answers), score, bandScore, startTime, endTime]);

        res.status(201).json({
          success: true,
          message: 'Submission saved',
          id: result.rows[0].id
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error saving submission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save submission',
        error: error.message
      });
    }
  }

  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};