@echo off
echo ================================
echo  Comic Downloader - Setup
echo ================================
echo.

echo [1/2] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend install failed
    pause
    exit /b 1
)
cd /d "%~dp0"

echo.
echo [2/2] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend install failed
    pause
    exit /b 1
)
cd /d "%~dp0"

echo.
echo ================================
echo  Setup complete!
echo ================================
echo.
echo Next steps:
echo  1. Edit backend/.env and add your TARGET_SITES
echo  2. Run run.bat to start the app
echo.
pause
