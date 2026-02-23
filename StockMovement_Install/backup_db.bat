@echo off
chcp 65001 >nul
title Stock Movement - Database Backup
color 0B

echo ============================================
echo   Stock Movement - Database Backup
echo ============================================
echo.

:: Generate timestamp
for /f "tokens=1-3 delims=/" %%a in ("%date%") do (
    set day=%%a
    set month=%%b
    set year=%%c
)
for /f "tokens=1-2 delims=:" %%a in ("%time%") do (
    set hour=%%a
    set minute=%%b
)
set timestamp=%year%%month%%day%_%hour%%minute%

:: Create backups folder if not exists
if not exist "backups" mkdir backups

:: Backup database
echo Creating database backup...
C:\xampp\mysql\bin\mysqldump.exe -u root stock_db > "backups\backup_%timestamp%.sql"

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Backup created: backups\backup_%timestamp%.sql
) else (
    echo.
    echo [ERROR] Backup failed. Make sure MySQL is running.
)

echo.
pause
