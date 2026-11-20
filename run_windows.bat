@echo off
title My Project - Solar Farm Supply Chain & Logistics Model
echo ============================================================
echo   My Project - Solar Supply Chain & Logistics Dashboard
echo   Local Offline Windows Launcher
echo ============================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js LTS from https://nodejs.org/ and retry.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/2] Installing local dependencies (first run only)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Check your connection for first-time package setup.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Local dependencies verified.
)

echo [2/2] Starting local dashboard on http://localhost:3000 ...
echo Press Ctrl+C in this window to stop the dashboard when finished.
echo.

start "" "http://localhost:3000"
call npm run dev
pause
