import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2yHMSvBcN6rI@ep-old-tooth-agav7q24-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');

  const client = await pool.connect();

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const testResult = await client.query('SELECT NOW() as current_time');
    console.log(`✅ Connected to database at: ${testResult.rows[0].current_time}`);

    // Create test_submissions table
    console.log('📋 Creating test_submissions table...');
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Indexes for better query performance
        INDEX idx_student_id ON test_submissions(student_id),
        INDEX idx_skill ON test_submissions(skill),
        INDEX idx_mock_number ON test_submissions(mock_number),
        INDEX idx_created_at ON test_submissions(created_at)
      )
    `);
    console.log('✅ test_submissions table created successfully');

    // Create admin_sessions table for login tracking
    console.log('👤 Creating admin_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id SERIAL PRIMARY KEY,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('✅ admin_sessions table created successfully');

    // Create some sample data for testing
    console.log('🎯 Creating sample test data...');
    const sampleSubmissions = [
      {
        student_id: 'TEST001',
        student_name: 'Sample Student',
        mock_number: 1,
        skill: 'reading',
        answers: JSON.stringify({
          'q1': 'TRUE',
          'q2': 'FALSE',
          'q3': 'NOT GIVEN',
          'q4': 'economy',
          'q5': 'environment'
        }),
        score: 32,
        band_score: '7.0',
        start_time: new Date(Date.now() - 3600000), // 1 hour ago
        end_time: new Date(Date.now() - 600000) // 10 minutes ago
      },
      {
        student_id: 'TEST002',
        student_name: 'Demo User',
        mock_number: 1,
        skill: 'writing',
        answers: JSON.stringify({
          'task_1': 'The chart shows population growth trends over the past decade...',
          'task_2': 'In my opinion, technology has significantly impacted modern education...'
        }),
        score: null, // Writing doesn't have automatic scoring
        band_score: '6.5',
        start_time: new Date(Date.now() - 7200000), // 2 hours ago
        end_time: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ];

    // Insert sample data
    for (const submission of sampleSubmissions) {
      await client.query(`
        INSERT INTO test_submissions
        (student_id, student_name, mock_number, skill, answers, score, band_score, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `, [
        submission.student_id,
        submission.student_name,
        submission.mock_number,
        submission.skill,
        submission.answers,
        submission.score,
        submission.band_score,
        submission.start_time,
        submission.end_time
      ]);
    }
    console.log('✅ Sample data created successfully');

    // Verify table structure
    console.log('🔍 Verifying table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'test_submissions'
      ORDER BY ordinal_position
    `);

    console.log('📋 test_submissions table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Check record count
    const countResult = await client.query('SELECT COUNT(*) FROM test_submissions');
    console.log(`📊 Total records in test_submissions: ${countResult.rows[0].count}`);

    console.log('🎉 Database initialization completed successfully!');

    return {
      success: true,
      tables_created: ['test_submissions', 'admin_sessions'],
      sample_records: sampleSubmissions.length,
      total_records: parseInt(countResult.rows[0].count)
    };

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization
if (process.argv[1] === new URL(import.meta.url).pathname) {
  initializeDatabase()
    .then(result => {
      console.log('\n✅ Initialization Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Failed to initialize database:', error);
      process.exit(1);
    });
}

export default initializeDatabase;