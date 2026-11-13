# Backend image: Node 18 + system Chromium (Puppeteer drives it for scraping).
FROM node:18-bookworm-slim

# Chromium + the shared libs it needs to run headless, plus fonts.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg \
      chromium \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
      fonts-liberation fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install production deps first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --prefer-offline

# App source. Config (TARGET_SITES, PORT) is supplied via environment in docker-compose,
# so the local .env is intentionally NOT baked into the image.
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
