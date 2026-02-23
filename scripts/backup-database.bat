@echo off
REM =====================================================
REM Stock Movement Pro - Database Backup Script
REM =====================================================
REM This script creates a backup of the stock_movement database
REM and keeps the last 7 days of backups

setlocal enabledelayedexpansion

REM Configuration
set MYSQL_PATH=C:\xampp\mysql\bin
set BACKUP_DIR=C:\xampp\htdocs\stock_movement\backups
set DB_NAME=stock_movement
set DB_USER=root
set DB_PASS=
set KEEP_DAYS=7

REM Create backup directory if not exists
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%

REM Backup filename
set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_%TIMESTAMP%.sql

echo =====================================================
echo  Stock Movement Pro - Database Backup
echo =====================================================
echo.
echo Database: %DB_NAME%
echo Backup File: %BACKUP_FILE%
echo.

REM Run mysqldump
echo Creating backup...
if "%DB_PASS%"=="" (
    "%MYSQL_PATH%\mysqldump.exe" -u %DB_USER% %DB_NAME% > "%BACKUP_FILE%"
) else (
    "%MYSQL_PATH%\mysqldump.exe" -u %DB_USER% -p%DB_PASS% %DB_NAME% > "%BACKUP_FILE%"
)

if %errorlevel% neq 0 (
    echo ERROR: Backup failed!
    exit /b 1
)

echo Backup created successfully!
echo.

REM Compress backup (if 7z is available)
where 7z >nul 2>nul
if %errorlevel% equ 0 (
    echo Compressing backup...
    7z a -tgzip "%BACKUP_FILE%.gz" "%BACKUP_FILE%" >nul
    del "%BACKUP_FILE%"
    set BACKUP_FILE=%BACKUP_FILE%.gz
    echo Compressed to: !BACKUP_FILE!
)

REM Delete old backups
echo.
echo Cleaning up old backups (older than %KEEP_DAYS% days)...
forfiles /p "%BACKUP_DIR%" /m "*.sql*" /d -%KEEP_DAYS% /c "cmd /c del @path" 2>nul
echo Done!

echo.
echo =====================================================
echo  Backup Complete!
echo =====================================================
echo.
echo Backup Location: %BACKUP_FILE%
echo.

endlocal
