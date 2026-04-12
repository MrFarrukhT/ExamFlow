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
echo  Opening test interface in default browser...
echo  (Anti-cheat and fullscreen are enforced by the app itself)
echo.

REM Launch Chrome in kiosk mode — true OS-level lockdown.
REM Kiosk mode disables Alt+Tab, Alt+F4, Ctrl+W, Ctrl+F4, Escape, and the
REM address bar. The JS anti-cheat (fullscreen, beforeunload, violation
REM reporting) acts as a second layer for non-kiosk environments.
REM Use a separate user-data-dir so the kiosk instance doesn't interfere
REM with the admin's normal Chrome session.
set KIOSK_PROFILE=%TEMP%\zarmed-olympiada-kiosk
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-pinch --overscroll-history-navigation=0 --user-data-dir="%KIOSK_PROFILE%" "http://localhost:3004/"

timeout /t 2 /nobreak >nul
