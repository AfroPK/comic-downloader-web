#!/bin/bash
echo "Starting Comic Downloader (local)..."
echo ""
echo "1. Starting backend on http://localhost:3000"
echo "2. Starting frontend on http://localhost:5173"
echo ""
echo "Open http://localhost:5173 in your browser"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start backend in background
cd "$(dirname "$0")"
nohup npm --prefix backend start > /dev/null 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend in background
nohup npm --prefix frontend run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

echo ""
echo "Both servers started! Open http://localhost:5173"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
