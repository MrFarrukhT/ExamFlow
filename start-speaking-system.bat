@echo off
echo ================================================
echo Cambridge Speaking Test System - Quick Start
echo ================================================
echo.
echo Starting Cambridge Database Server...
echo.
echo Server will run on: http://localhost:3003
echo.
echo IMPORTANT:
echo - Keep this window open while using the system
echo - Students can now access speaking tests
echo - Invigilators can evaluate at: cambridge-speaking-evaluations.html
echo.
echo ================================================
echo.

node cambridge-database-server.js

pause
