FROM node:20-slim

# Install system dependencies for Puppeteer & Chrome
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-ipafont-gothic \
  fonts-wqy-zenhei \
  fonts-thai-tlwg \
  fonts-kacst \
  fonts-freefont-ttf \
  libxss1 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Skip Puppeteer's own Chrome download, use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/. .

EXPOSE 10000

CMD ["npm", "start"]
