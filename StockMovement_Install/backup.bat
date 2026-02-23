@echo off
set "BACKUP_DIR=backups"
rem Get date and time in a format suitable for filenames
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo ==================================================
echo      Stock Movement System - Database Backup
echo ==================================================
echo.
echo Connecting to API for data export...

curl -s "http://localhost:3000/api/backup" > "%BACKUP_DIR%\backup_%TIMESTAMP%.json"

echo.
echo Backup process finished.
echo File saved to: %BACKUP_DIR%\backup_%TIMESTAMP%.json
echo.
pause
