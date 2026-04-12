@echo off
title Zarmed University - C1 Olympiada
color 06
echo.
echo  ============================================
echo   ZARMED UNIVERSITY
echo   C1 LANGUAGE OLYMPIADA
echo   (English C1 + German C1 — standalone)
echo  ============================================
echo.
echo  Starting Olympiada server...
echo.

REM Enable Neon database mirror (syncs results to cloud for admin access from anywhere)
set OLYMPIADA_DATABASE_URL=postgresql://neondb_owner:npg_iVFqG04oTxbO@ep-blue-moon-alyk1vvi-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require

REM Start the standalone Olympiada server in a background window
pushd "%~dp0"
start "Zarmed Olympiada Server" /MIN cmd /c "node server.js"
popd

REM Give the server a moment to boot
timeout /t 3 /nobreak >nul
echo  Server started on http://localhost:3004
echo.
echo  Opening student test interface...
echo.

REM Try different browsers in order of preference
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo  Launching with Google Chrome (kiosk mode)...
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-pinch --overscroll-history-navigation=disabled --disable-translate --disable-extensions --disable-infobars --no-first-run --app="http://localhost:3004/"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo  Launching with Google Chrome (kiosk mode)...
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk --disable-pinch --overscroll-history-navigation=disabled --disable-translate --disable-extensions --disable-infobars --no-first-run --app="http://localhost:3004/"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo  Launching with Microsoft Edge (kiosk mode)...
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --kiosk --disable-pinch --overscroll-history-navigation=disabled --disable-translate --disable-extensions --disable-infobars --no-first-run --app="http://localhost:3004/"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo  Launching with Microsoft Edge (kiosk mode)...
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk --disable-pinch --overscroll-history-navigation=disabled --disable-translate --disable-extensions --disable-infobars --no-first-run --app="http://localhost:3004/"
) else (
    echo  ERROR: No supported browser found!
    echo  Please install Google Chrome or Microsoft Edge.
    echo.
    pause
)

timeout /t 2 /nobreak >nul
