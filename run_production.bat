@echo off
REM Speakify Production Runner
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   SPEAKIFY - PDF to Speech Converter
echo   Production Mode
echo ========================================
echo.

REM Change to project directory
cd /d "c:\Users\Admin Sania\OneDrive\Desktop\sem 3-2\intern\Speakify"

start "" http://localhost:5000
echo [*] Starting Speakify Node.js application...
echo [*] Server will be available at: http://localhost:5000
echo [*] Press CTRL+C to stop the server
echo.

node server.js

pause
.\run_production.bat
