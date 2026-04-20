@echo off
setlocal EnableExtensions
echo ===========================================
echo Building StockMovement Deploy Tool (.exe)
echo ===========================================

cd /d "%~dp0" || (echo Failed to change directory to "%~dp0" & exit /b 1)

echo [1/3] Checking PyInstaller...
where python >nul 2>&1 || (echo Python not found in PATH & exit /b 1)
python -m pip install --disable-pip-version-check pyinstaller customtkinter packaging || exit /b 1

echo [2/3] Building Executable...
if exist StockDeploy.spec (
  python -m PyInstaller --noconfirm StockDeploy.spec || exit /b 1
) else (
  python -m PyInstaller --noconfirm --onefile --windowed --name "StockDeploy" --collect-all customtkinter deploy_tool.py || exit /b 1
)

echo [3/3] Cleaning up...
if exist build rmdir /s /q build 2>nul

echo.
echo Build Complete!
echo Executable is located at: tools\dist\StockDeploy.exe
echo.
pause
