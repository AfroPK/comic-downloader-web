#!/bin/bash
set -e

echo "=========================================="
echo "  Comic Downloader - Home Server Setup"
echo "=========================================="

# Update system
echo "[1/7] Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "[2/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "Docker installed. Log out and back in for group changes to take effect."
else
    echo "Docker already installed."
fi

# Install Docker Compose plugin
echo "[3/7] Installing Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    sudo apt install -y docker-compose-plugin
fi

# Create app directory
echo "[4/7] Setting up app directory..."
APP_DIR="$HOME/comic-downloader"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repo
echo "[5/7] Cloning repository..."
if [ -d "$APP_DIR/comic-downloader-web" ]; then
    cd comic-downloader-web
    git pull origin main
else
    git clone https://github.com/AfroPK/comic-downloader-web.git
    cd comic-downloader-web
fi

# Create .env for backend (optional - for proxy or extra config)
echo "[6/7] Creating environment config..."
cat > backend/.env << 'EOF'
PORT=10000
NODE_ENV=production
TARGET_SITES=https://batcave.biz,https://xoxocomic.com
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EOF

echo "[7/7] Building and starting containers..."
sudo docker compose up -d --build

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Services running:"
echo "  Backend API:    http://192.168.0.214:3000"
echo "  Portainer UI:   http://192.168.0.214:9000"
echo ""
echo "Health check:"
echo "  curl http://192.168.0.214:3000/api/health"
echo ""
echo "Useful commands:"
echo "  sudo docker compose logs -f backend    # View backend logs"
echo "  sudo docker compose ps                  # List containers"
echo "  sudo docker compose down                # Stop all"
echo "  sudo docker compose up -d --build       # Rebuild and restart"
echo ""
