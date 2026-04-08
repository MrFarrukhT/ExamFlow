@echo off
title Innovative Centre - Admin Dashboard
color 0A
echo.
echo  ==========================================
echo  INNOVATIVE CENTRE - ADMIN DASHBOARD
echo  ==========================================
echo.
echo  Starting admin dashboard...
echo  Please wait...
echo.

REM Start the local database server in background if not running
echo  Checking database server...
netstat -ano | findstr :3002 >nul
if %errorlevel% neq 0 (
    echo  Starting database server...
    start /B node local-database-server.js
    timeout /t 3 /nobreak >nul
    echo  Database server started!
) else (
    echo  Database server already running!
)

echo.

REM Try different browsers in order of preference
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo  Opening enhanced admin dashboard with Google Chrome...
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "file:///%~dp0ielts-admin-dashboard.html"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo  Opening enhanced admin dashboard with Google Chrome...
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window "file:///%~dp0ielts-admin-dashboard.html"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo  Opening enhanced admin dashboard with Microsoft Edge...
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --new-window "file:///%~dp0ielts-admin-dashboard.html"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo  Opening enhanced admin dashboard with Microsoft Edge...
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window "file:///%~dp0ielts-admin-dashboard.html"
) else (
    echo  ERROR: No supported browser found!
    echo  Please install Google Chrome or Microsoft Edge.
    echo  Or manually open: ielts-admin-dashboard.html
    echo.
    pause
)

echo.
echo  Admin dashboard opened successfully!
echo  Login credentials: admin / admin123
echo.
timeout /t 2 /nobreak >nul