const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_2yHMSvBcN6rI@ep-old-tooth-agav7q24-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await ensureConnection();

    // GET /mock-answers?mock=1&skill=reading - Get answers for specific mock and skill
    if (req.method === 'GET') {
      const { mock, skill } = req.query;

      if (!mock || !skill) {
        return res.status(400).json({
          success: false,
          message: 'Mock number and skill are required'
        });
      }

      const result = await client.query(
        'SELECT * FROM mock_answers WHERE mock_number = $1 AND skill = $2 ORDER BY question_number',
        [parseInt(mock), skill]
      );

      // Convert to the format expected by the frontend
      const answers = {};
      result.rows.forEach(row => {
        const questionKey = skill === 'listening' ? `q${row.question_number}` : `${row.question_number}`;
        
        // Handle alternative answers
        let answerValue = row.correct_answer;
        if (row.alternative_answers && row.alternative_answers.length > 0) {
          answerValue = [row.correct_answer, ...row.alternative_answers];
        }
        
        answers[questionKey] = answerValue;
      });

      return res.json({
        success: true,
        answers: answers,
        count: result.rows.length
      });
    }

    // POST /mock-answers - Save answers for specific mock and skill
    if (req.method === 'POST') {
      const { mock, skill, answers } = req.body;

      if (!mock || !skill || !answers) {
        return res.status(400).json({
          success: false,
          message: 'Mock number, skill, and answers are required'
        });
      }

      // Begin transaction
      await client.query('BEGIN');

      try {
        // Clear existing answers for this mock/skill combination
        await client.query(
          'DELETE FROM mock_answers WHERE mock_number = $1 AND skill = $2',
          [parseInt(mock), skill]
        );

        // Insert new answers
        let insertedCount = 0;
        for (const [questionKey, answerValue] of Object.entries(answers)) {
          // Extract question number from key (remove 'q' prefix if present)
          const questionNumber = parseInt(questionKey.replace(/^q/, ''));
          
          if (isNaN(questionNumber)) continue;

          let correctAnswer;
          let alternativeAnswers = null;

          if (Array.isArray(answerValue)) {
            correctAnswer = answerValue[0];
            if (answerValue.length > 1) {
              alternativeAnswers = JSON.stringify(answerValue.slice(1));
            }
          } else {
            correctAnswer = answerValue;
          }

          await client.query(
            `INSERT INTO mock_answers 
             (mock_number, skill, question_number, correct_answer, alternative_answers, updated_at) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [parseInt(mock), skill, questionNumber, correctAnswer, alternativeAnswers]
          );
          
          insertedCount++;
        }

        // Commit transaction
        await client.query('COMMIT');

        return res.json({
          success: true,
          message: `Saved ${insertedCount} answers for Mock ${mock} - ${skill.toUpperCase()}`,
          count: insertedCount
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    // DELETE /mock-answers?mock=1&skill=reading - Delete answers for specific mock and skill
    if (req.method === 'DELETE') {
      const { mock, skill } = req.query;

      if (!mock || !skill) {
        return res.status(400).json({
          success: false,
          message: 'Mock number and skill are required'
        });
      }

      const result = await client.query(
        'DELETE FROM mock_answers WHERE mock_number = $1 AND skill = $2',
        [parseInt(mock), skill]
      );

      return res.json({
        success: true,
        message: `Deleted ${result.rowCount} answers for Mock ${mock} - ${skill.toUpperCase()}`,
        count: result.rowCount
      });
    }

    res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error) {
    console.error('Mock answers API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};