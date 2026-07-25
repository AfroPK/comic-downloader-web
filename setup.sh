#!/bin/bash
echo "================================"
echo " Comic Downloader - Setup"
echo "================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/2] Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Backend install failed"
    exit 1
fi
cd "$SCRIPT_DIR"

echo ""
echo "[2/2] Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend install failed"
    exit 1
fi
cd "$SCRIPT_DIR"

echo ""
echo "================================"
echo " Setup complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env and add your TARGET_SITES"
echo "  2. Run ./run.sh to start the app"
echo ""
