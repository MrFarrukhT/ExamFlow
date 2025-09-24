const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes (these will be handled by Vercel serverless functions in production)
const loginHandler = require('./api/login');
const submissionsHandler = require('./api/submissions');

app.use('/api/login', loginHandler);
app.use('/api/submissions', submissionsHandler);

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server (for local development only)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Admin panel running on http://localhost:${PORT}`);
        console.log(`📊 Access admin panel at: http://localhost:${PORT}`);
        console.log(`🔑 Login credentials: admin / admin123`);
    });
}

module.exports = app;