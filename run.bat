@echo off
echo Starting Comic Downloader (local)...
echo.
echo 1. Starting backend on http://localhost:3000
echo 2. Starting frontend on http://localhost:5173
echo.
echo Open http://localhost:5173 in your browser
echo.
echo Press Ctrl+C to stop
echo.

:: Start backend in background
cd /d "%~dp0backend"
start "Comic Downloader - Backend" cmd /k "npm start"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend
cd /d "%~dp0frontend"
start "Comic Downloader - Frontend" cmd /k "npm run dev"

echo.
echo Both servers started! Open http://localhost:5173
pause
