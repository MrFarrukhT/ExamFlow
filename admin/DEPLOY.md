# Deployment Guide for Innovative Centre Admin Panel

## Step 1: Install Vercel CLI

If you don't have Vercel CLI installed:
```bash
npm install -g vercel
```

## Step 2: Deploy to Vercel

1. Open a terminal/command prompt
2. Navigate to the admin folder:
   ```bash
   cd "C:\Users\Windows 11\Desktop\Scalable Architecture\Innovative Centre MOCK\admin"
   ```

3. Login to Vercel (if not already logged in):
   ```bash
   vercel login
   ```

4. Deploy the project:
   ```bash
   vercel --prod
   ```

5. Follow the prompts:
   - **Set up and deploy?** → Y
   - **Which scope?** → Select your account
   - **Link to existing project?** → N
   - **Project name** → innovative-centre-admin (or press Enter for default)
   - **In which directory?** → Press Enter (current directory)
   - **Override settings?** → N

## Step 3: Get Your Deployment URL

After deployment, Vercel will give you a URL like:
```
https://innovative-centre-admin-xxxx.vercel.app
```

**Copy this URL - you'll need it for Step 4!**

## Step 4: Update the Main Test System

Now update the API URL in your main test system:

1. Open the file: `assets/js/session-manager.js`
2. Find line 206 (around this line):
   ```javascript
   const ADMIN_API_BASE = 'https://innovative-centre-admin.vercel.app/api';
   ```
3. Replace it with your actual Vercel URL:
   ```javascript
   const ADMIN_API_BASE = 'https://YOUR-VERCEL-URL.vercel.app/api';
   ```

## Step 5: Test the Setup

1. **Test Admin Panel:**
   - Visit your Vercel URL
   - Login with: `admin` / `admin123`
   - You should see the admin dashboard

2. **Test Database Connection:**
   - Complete a test in your main system
   - Check if it appears in the admin panel
   - If you see "unable to save to database" error, check the browser console for details

## Troubleshooting

### If deployment fails:
```bash
# Try deploying again
vercel --prod --force
```

### If database connection fails:
1. Check that the DATABASE_URL environment variable is set correctly in Vercel dashboard
2. Go to your Vercel project settings → Environment Variables
3. Add: `DATABASE_URL` = `postgresql://neondb_owner:npg_2yHMSvBcN6rI@ep-old-tooth-agav7q24-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

### If CORS errors occur:
The APIs are configured to allow all origins (`*`), but if you have issues, you can update the CORS headers in the API files.

## After Successful Deployment

1. Your admin panel will be accessible at your Vercel URL
2. Test submissions from your main system will be saved to the Neon database
3. You can view all submissions in the admin panel
4. The database will automatically create the required tables on first use

## Next Steps

- Bookmark your admin panel URL
- Share the URL and credentials with authorized administrators
- Consider changing the admin password in `/api/login.js` for security