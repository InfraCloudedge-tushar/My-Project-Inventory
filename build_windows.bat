@echo off
title My Project - Build & Preview Offline Bundle
echo Building optimized local bundle...
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Build failed.
    pause
    exit /b 1
)
echo Launching local production preview at http://localhost:4173 ...
start "" "http://localhost:4173"
call npm run preview
pause
