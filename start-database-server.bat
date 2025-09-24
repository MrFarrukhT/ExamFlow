@echo off
echo ========================================
echo Starting Innovative Centre Database Server
echo ========================================

echo Installing dependencies...
npm install

echo.
echo Starting local database server...
echo Server will run on: http://localhost:3001
echo.

node local-database-server.js