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
echo  Opening admin panel...
echo.

REM Open in default browser
start "" "http://localhost:3004/admin.html"

timeout /t 2 /nobreak >nul
