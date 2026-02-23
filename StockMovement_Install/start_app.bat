@echo off
title Stock Movement App Launcher
color 0A

:: Navigate to project root
cd /d "%~dp0"

echo ====================================================
echo      Stock Movement Application Launcher
echo ====================================================
echo.

:CHECK_BUILD
:: Check for specific production build file (BUILD_ID)
:: standard .next folder exists even in dev mode, so we must check for BUILD_ID
if not exist ".next\BUILD_ID" (
    echo [!] Production build not found or incomplete.
    echo [!] Building application now. This may take a few minutes...
    echo.
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo [X] Build Failed! Please check the errors above.
        echo.
        pause
        exit /b
    )
    echo.
    echo [V] Build Complete!
    echo.
)

:START_SERVER
echo [*] Starting Server...
echo [*] App will be available at: http://localhost:3000
echo.
echo     (Keep this window open while using the app)
echo.

call npm start

if %ERRORLEVEL% NEQ 0 (
    color 0E
    echo.
    echo [!] Server stopped or failed to start.
    echo.
    echo [?] It looks like the build might be missing or corrupt.
    echo [?] Do you want to force a REBUILD now? (Y/N)
    set /p choice="> "
    if /i "%choice%"=="Y" (
        echo.
        echo [*] Cleaning old build...
        rmdir /s /q .next
        goto CHECK_BUILD
    )
)

pause
