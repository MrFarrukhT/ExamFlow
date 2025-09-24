@echo off
echo ==========================================
echo Installing dependencies for Admin Panel
echo ==========================================

echo.
echo Installing Node.js packages...
npm install

echo.
echo Current directory contents:
dir /b

echo.
echo Package.json contents:
type package.json

echo.
echo Vercel.json contents:
type vercel.json

echo.
echo ==========================================
echo Installation complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Create a GitHub repository
echo 2. Upload all files to GitHub
echo 3. Deploy via Vercel website
echo 4. Visit /init.html to setup database
echo ==========================================
pause