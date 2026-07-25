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
start "Comic Downloader - Backend" /K "cd /d D:\\AIWorkspace\\comic-downloader-web\\backend && npm start"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend
start "Comic Downloader - Frontend" /K "cd /d D:\\AIWorkspace\\comic-downloader-web\\frontend && npm run dev"

echo.
echo Both servers started! Open http://localhost:5173
pause
