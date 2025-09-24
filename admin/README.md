# Innovative Centre Admin Panel

This admin panel allows administrators to view completed test submissions from the Innovative Centre Test System.

## Features

- 🔐 Simple login system (admin/admin123)
- 📊 Dashboard with submission statistics
- 📋 View all completed test submissions
- 💾 PostgreSQL database integration with Neon
- 🚀 Vercel deployment ready

## Deployment to Vercel

1. **Prepare the admin folder:**
   - Ensure this `admin` folder is ready for deployment
   - The `vercel.json` configuration is already set up

2. **Deploy to Vercel:**
   ```bash
   # Navigate to the admin directory
   cd admin

   # Install Vercel CLI if not already installed
   npm install -g vercel

   # Deploy to Vercel
   vercel
   ```

3. **Environment Variables:**
   The database connection string is already configured in `vercel.json`, but you can also set it as an environment variable in Vercel dashboard:
   - `DATABASE_URL`: `postgresql://neondb_owner:npg_2yHMSvBcN6rI@ep-old-tooth-agav7q24-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

4. **Access the Admin Panel:**
   - Once deployed, visit your Vercel URL
   - Login with: `admin` / `admin123`
   - View all completed test submissions

## Database Schema

The system automatically creates the following table:

```sql
CREATE TABLE test_submissions (
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
);
```

## API Endpoints

### POST /api/login
Login endpoint for admin authentication.

**Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

### GET /api/submissions
Get all test submissions.

**Headers:**
```
Authorization: Bearer <token>
```

### POST /api/submissions
Save a new test submission (called automatically by the test system).

**Body:**
```json
{
  "studentId": "string",
  "studentName": "string",
  "mockNumber": "number",
  "skill": "string",
  "answers": "object",
  "score": "number",
  "bandScore": "string",
  "startTime": "ISO string",
  "endTime": "ISO string"
}
```

## Integration with Main Test System

The main test system automatically saves completed tests to this admin database. Update the `ADMIN_API_BASE` URL in `session-manager.js` to point to your deployed Vercel URL:

```javascript
const ADMIN_API_BASE = 'https://your-vercel-deployment.vercel.app/api';
```

## Security Notes

- Change the admin password in `/api/login.js` before deployment
- The current implementation uses a simple token system suitable for demo purposes
- For production use, consider implementing more robust authentication
- Database connection string should be stored as environment variable for better security

## Support

For issues with deployment or functionality, check:
1. Vercel deployment logs
2. Browser console for API errors
3. Database connection status in the Vercel functions