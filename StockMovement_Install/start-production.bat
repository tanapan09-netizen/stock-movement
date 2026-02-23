@echo off
setlocal enabledelayedexpansion
title Stock Movement - Production Server
color 0B
cd /d "%~dp0"

echo ========================================
echo   Stock Movement Pro - PRODUCTION Mode
echo ========================================
echo.

:: Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

:: Check if port 3000 is in use
echo [INFO] Checking port 3000...
set PORT_IN_USE=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set PID=%%a
    set PORT_IN_USE=1
)

if !PORT_IN_USE!==1 (
    echo.
    echo ========================================
    echo [WARNING] Port 3000 is already in use!
    echo           Process ID: !PID!
    echo ========================================
    echo.
    set /p CONFIRM="Do you want to stop the existing process? (Y/N): "
    if /i "!CONFIRM!"=="Y" (
        echo [INFO] Stopping process !PID!...
        taskkill /PID !PID! /F >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] Failed to stop process. Try running as Administrator.
            pause
            exit /b 1
        )
        echo [OK] Process stopped successfully.
        timeout /t 2 /nobreak >nul
    ) else (
        echo [INFO] Cancelled. Please stop the existing process manually.
        pause
        exit /b 0
    )
)

:: Check dependencies
if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
)

:: Generate Prisma client
echo [INFO] Generating Prisma Client...
call npx prisma generate

:: ALWAYS build for production to avoid stale builds
echo.
echo [INFO] Building application for production...
echo        This may take 1-2 minutes. Please wait...
echo.

if exist .next (
    rmdir /s /q .next
)
call npm run build

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Please check the errors above.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Build complete!
echo.
echo ========================================
echo Starting PRODUCTION server...
echo Server will be available at: http://localhost:3000
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

:: Open browser after 3 seconds delay in background
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start production server (Standalone Mode)
:: Copy static assets for standalone build
echo [INFO] Copying static assets to standalone build...
xcopy /E /I /Y "public" ".next\standalone\public" >nul 2>&1
xcopy /E /I /Y ".next\static" ".next\standalone\.next\static" >nul 2>&1

echo [INFO] Starting standalone server...
node .next\standalone\server.js

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start.
)

pause
