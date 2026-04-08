@echo off
title Innovative Centre - Cambridge Test System
color 09
echo.
echo  ==========================================
echo  INNOVATIVE CENTRE - CAMBRIDGE TEST SYSTEM
echo  ==========================================
echo.
echo  Starting secure test environment...
echo  Please wait...
echo.

REM Start the Cambridge database server in background
echo  Starting Cambridge database server...
start /B node cambridge-database-server.js
timeout /t 3 /nobreak >nul
echo  Cambridge database server started successfully!
echo.

REM Try different browsers in order of preference
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo  Launching with Google Chrome...
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --start-fullscreen --disable-web-security --disable-features=VizDisplayCompositor --app="http://localhost:3003"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo  Launching with Google Chrome...
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --start-fullscreen --disable-web-security --disable-features=VizDisplayCompositor --app="http://localhost:3003"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo  Launching with Microsoft Edge...
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --new-window --start-fullscreen --app="http://localhost:3003"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo  Launching with Microsoft Edge...
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window --start-fullscreen --app="http://localhost:3003"
) else (
    echo  ERROR: No supported browser found!
    echo  Please install Google Chrome or Microsoft Edge.
    echo.
    pause
)

REM Keep window open for a moment
timeout /t 2 /nobreak >nul
