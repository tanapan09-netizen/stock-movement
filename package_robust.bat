@echo off
echo Cleaning up previous build...
if exist StockMovement_Install rmdir /s /q StockMovement_Install
if exist StockMovement_Install.zip del StockMovement_Install.zip

echo Copying files...
mkdir StockMovement_Install

:: Use Robocopy for robust copying
:: /XD = Exclude Directories
:: /XF = Exclude Files
:: /S = Subdirectories (excluding empty)
:: /E = Subdirectories (including empty)
robocopy . StockMovement_Install /E /XD node_modules .next .git .vscode logs backups StockMovement_Install /XF *.zip *.log *.rar package-lock.json

echo Compressing files...
powershell -Command "Compress-Archive -Path StockMovement_Install -DestinationPath StockMovement_Install.zip"

if exist StockMovement_Install.zip (
    echo.
    echo [SUCCESS] Package created: StockMovement_Install.zip
) else (
    echo.
    echo [ERROR] Failed to create zip file.
)
pause
