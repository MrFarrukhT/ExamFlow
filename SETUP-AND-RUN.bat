@echo off
echo ================================================
echo    IELTS Test System - Automated Setup
echo    Innovative Centre
echo ================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    echo.
    echo 📥 Download from: https://nodejs.org
    echo    Choose: "LTS" version for Windows
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

echo.
echo 📦 Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Setup completed successfully!
echo.
echo 🚀 Starting IELTS Test System...
echo    - Local database server will start
echo    - Browser will open automatically
echo    - System will be ready in 5 seconds
echo.

:: Start the database server in background
start /min "IELTS Database" cmd /c "node local-database-server.js"

:: Wait for server to start
timeout /t 5 /nobreak >nul

:: Open the application in browser
start "" "http://localhost:3002"

echo � IELTS Test System is now running!
echo.
echo � Instructions:
echo    • Open your browser and go to: http://localhost:3002
echo    • Click on "LAUNCHER" to start using the application  
echo    • The system is ready - use the IELTS test interface
echo    • To stop: Close this command window
echo.
echo ✅ System is working! Open the launcher and start testing.
echo.
echo Press any key to minimize this window...
pause >nul

:: Keep the server running but minimize the window
powershell -command "(New-Object -ComObject Shell.Application).MinimizeAll()"