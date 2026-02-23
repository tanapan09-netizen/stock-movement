@echo off
echo ===========================================
echo Building StockMovement Deploy Tool (.exe)
echo ===========================================

cd /d "%~dp0"

echo [1/3] Checking PyInstaller...
pip install pyinstaller

echo [2/3] Building Executable...
pyinstaller --noconfirm --onefile --windowed --name "StockDeploy" deploy_tool.py

echo [3/3] Cleaning up...
rmdir /s /q build
del /q StockDeploy.spec

echo.
echo Build Complete!
echo Executable is located at: tools\dist\StockDeploy.exe
echo.
pause
