@echo off
title Zarmed Olympiada - Admin Panel
color 0B
echo.
echo  ============================================
echo   ZARMED UNIVERSITY
echo   C1 OLYMPIADA — ADMIN PANEL
echo  ============================================
echo.
echo  Password: zarmed-admin
echo.
echo  Starting Olympiada server...
echo.

REM Start the standalone Olympiada server in a background window
pushd "%~dp0"
start "Zarmed Olympiada Server" /MIN cmd /c "node server.js"
popd

REM Give the server a moment to boot
timeout /t 3 /nobreak >nul
echo  Server started on http://localhost:3004
echo.
echo  Opening admin panel...
echo.

REM Try different browsers in order of preference
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo  Launching with Google Chrome...
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --app="http://localhost:3004/admin.html"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo  Launching with Google Chrome...
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --app="http://localhost:3004/admin.html"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo  Launching with Microsoft Edge...
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --new-window --app="http://localhost:3004/admin.html"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo  Launching with Microsoft Edge...
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window --app="http://localhost:3004/admin.html"
) else (
    echo  ERROR: No supported browser found!
    echo  Please install Google Chrome or Microsoft Edge.
    echo.
    pause
)

timeout /t 2 /nobreak >nul
