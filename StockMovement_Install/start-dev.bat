@echo off
title Stock Movement - Development Server
color 0A
cd /d "%~dp0"

echo ========================================
echo   Stock Movement Pro - DEVELOPMENT Mode
echo ========================================
echo.

:: Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

:: Check dependencies
if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
)

:: Generate Prisma client
echo [INFO] Generating Prisma Client...
call npx prisma generate

echo.
echo ========================================
echo Starting DEVELOPMENT server...
echo Server will be available at: http://localhost:3000
echo ========================================
echo.
echo ** Hot Reload enabled - changes will auto-refresh **
echo ** Press Ctrl+C to stop the server **
echo.

:: Start development server (no build required)
call npm run dev

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start.
)

pause
