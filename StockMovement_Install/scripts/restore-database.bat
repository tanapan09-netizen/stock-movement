@echo off
REM =====================================================
REM Stock Movement Pro - Database Restore Script
REM =====================================================
REM Usage: restore-database.bat [backup_file.sql]

setlocal

REM Configuration
set MYSQL_PATH=C:\xampp\mysql\bin
set BACKUP_DIR=C:\xampp\htdocs\stock_movement\backups
set DB_NAME=stock_movement
set DB_USER=root
set DB_PASS=

echo =====================================================
echo  Stock Movement Pro - Database Restore
echo =====================================================
echo.

REM Check if backup file is provided
if "%~1"=="" (
    echo Available backups:
    echo.
    dir /b "%BACKUP_DIR%\*.sql*" 2>nul
    echo.
    echo Usage: restore-database.bat [backup_file]
    echo Example: restore-database.bat stock_movement_2024-01-01_1200.sql
    exit /b 1
)

set BACKUP_FILE=%BACKUP_DIR%\%~1

REM Check if file exists
if not exist "%BACKUP_FILE%" (
    echo ERROR: Backup file not found: %BACKUP_FILE%
    exit /b 1
)

echo Database: %DB_NAME%
echo Restore From: %BACKUP_FILE%
echo.
echo WARNING: This will OVERWRITE the current database!
echo.

set /p CONFIRM="Are you sure? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Cancelled.
    exit /b 0
)

echo.
echo Restoring database...

REM Handle compressed files
echo %BACKUP_FILE% | findstr /i ".gz" >nul
if %errorlevel% equ 0 (
    echo Decompressing backup...
    where 7z >nul 2>nul
    if %errorlevel% equ 0 (
        7z x -so "%BACKUP_FILE%" | "%MYSQL_PATH%\mysql.exe" -u %DB_USER% %DB_NAME%
    ) else (
        echo ERROR: 7z not found. Cannot decompress .gz file.
        exit /b 1
    )
) else (
    if "%DB_PASS%"=="" (
        "%MYSQL_PATH%\mysql.exe" -u %DB_USER% %DB_NAME% < "%BACKUP_FILE%"
    ) else (
        "%MYSQL_PATH%\mysql.exe" -u %DB_USER% -p%DB_PASS% %DB_NAME% < "%BACKUP_FILE%"
    )
)

if %errorlevel% neq 0 (
    echo ERROR: Restore failed!
    exit /b 1
)

echo.
echo =====================================================
echo  Restore Complete!
echo =====================================================
echo.

endlocal
