// Simple authentication for admin panel
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // Using plain text for simplicity

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Check credentials
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return res.status(200).json({
          success: true,
          message: 'Login successful',
          token: 'admin-session-' + Date.now() // Simple token for demo
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  res.status(405).json({ message: 'Method not allowed' });
}