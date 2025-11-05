@echo off
title Innovative Centre - Cambridge Admin Dashboard
color 0B
echo.
echo  ==========================================
echo  CAMBRIDGE ADMIN DASHBOARD
echo  ==========================================
echo.
echo  Starting Cambridge admin dashboard...
echo  Please wait...
echo.

REM Start the Cambridge database server in background if not running
echo  Checking Cambridge database server...
netstat -ano | findstr :3003 >nul
if %errorlevel% neq 0 (
    echo  Starting Cambridge database server...
    start /B node cambridge-database-server.js
    timeout /t 3 /nobreak >nul
    echo  Cambridge database server started on port 3003!
) else (
    echo  Cambridge database server already running on port 3003!
)

echo.

REM Try different browsers in order of preference
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo  Opening Cambridge admin dashboard with Google Chrome...
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "file:///%~dp0cambridge-admin-dashboard.html"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo  Opening Cambridge admin dashboard with Google Chrome...
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window "file:///%~dp0cambridge-admin-dashboard.html"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo  Opening Cambridge admin dashboard with Microsoft Edge...
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --new-window "file:///%~dp0cambridge-admin-dashboard.html"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo  Opening Cambridge admin dashboard with Microsoft Edge...
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window "file:///%~dp0cambridge-admin-dashboard.html"
) else (
    echo  ERROR: No supported browser found!
    echo  Please install Google Chrome or Microsoft Edge.
    echo  Or manually open: cambridge-admin-dashboard.html
    echo.
    pause
)

echo.
echo  Cambridge Admin dashboard opened successfully!
echo  Login credentials: admin / Adm!n#2025$SecureP@ss
echo.
echo  Server running on: http://localhost:3003
echo  Dashboard: cambridge-admin-dashboard.html
echo.
timeout /t 2 /nobreak >nul
