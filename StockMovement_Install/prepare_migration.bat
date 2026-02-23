@echo off
echo ========================================================
echo      Stock Movement System - Migration Helper
echo ========================================================
echo.
echo This script will compress your project files into a ZIP archive.
echo It will EXCLUDE 'node_modules', '.next' and '.git' to save space.
echo.
echo Please wait...

powershell -Command "Get-ChildItem -Path . | Where-Object { $_.Name -notin @('node_modules', '.next', '.git', '.swc', 'stock-movement-backup.zip', '.gradle', 'build') } | Compress-Archive -DestinationPath '.\stock-movement-backup.zip' -Force"

echo.
echo ========================================================
echo      DONE!
echo ========================================================
echo.
echo Backup created: stock-movement-backup.zip
echo Copy this file and your Database SQL export (from phpMyAdmin) to the new machine.
echo.
pause
