@echo off
echo ==================================================
echo      Stock Movement System - Daily Digest Task
echo ==================================================
echo.
echo Connecting to server...
echo.

curl -X GET "http://localhost:3000/api/cron/daily-digest"

echo.
echo.
echo Task completed. You can verify the output in the server console/logs.
echo To automate this, set up a Windows Task Scheduler to run this script daily.
echo.
pause
