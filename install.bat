@echo off
chcp 65001 >nul
echo ====================================
echo   Stock Movement Pro - Installer
echo ====================================
echo.

REM Check Node.js
echo [1/5] Checking Node.js...
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Please install Node.js 18 or later.
    pause
    exit /b 1
)
echo       Node.js found!

REM Install dependencies
echo.
echo [2/5] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)
echo       Dependencies installed!

REM Copy env file
echo.
echo [3/5] Setting up environment...
if not exist .env (
    copy env.template .env >nul
    echo       Created .env file from template
    echo       [!] Please edit .env to configure database connection
) else (
    echo       .env file already exists
)

REM Generate Prisma
echo.
echo [4/5] Generating Prisma client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Prisma generate failed!
    pause
    exit /b 1
)
echo       Prisma client generated!

REM Build
echo.
echo [5/5] Building production...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ====================================
echo   Installation Complete!
echo ====================================
echo.
echo To start the server, run:
echo   npm run start
echo.
echo Then open: http://localhost:3000
echo Login: admin / admin
echo.
pause
