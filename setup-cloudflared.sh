#!/bin/bash
set -e

echo "=========================================="
echo "  Cloudflare Tunnel Setup"
echo "=========================================="

# Install cloudflared
echo "[1/4] Installing cloudflared..."
if ! command -v cloudflared &> /dev/null; then
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
else
    echo "cloudflared already installed."
fi

# Login to Cloudflare
echo "[2/4] Authenticating with Cloudflare..."
echo "A browser will open. Log in to your Cloudflare account."
cloudflared tunnel login

echo ""
echo "=========================================="
echo "  Create Your Tunnel"
echo "=========================================="
echo ""
echo "Run this command to create a tunnel:"
echo "  cloudflared tunnel create comic-downloader"
echo ""
echo "Then note the Tunnel ID it outputs."
echo ""
echo "Next, create a config file at ~/.cloudflared/config.yml:"
echo ""
cat << 'EOF'
tunnel: <YOUR-TUNNEL-ID>
credentials-file: /home/freddy/.cloudflared/<YOUR-TUNNEL-ID>.json

ingress:
  - hostname: comic-downloader.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

echo ""
echo "Then run:"
echo "  cloudflared tunnel route dns comic-downloader comic-downloader.yourdomain.com"
echo "  sudo cloudflared service install"
echo "  sudo systemctl start cloudflared"
echo ""
echo "Your backend will be available at:"
echo "  https://comic-downloader.yourdomain.com"
echo ""
