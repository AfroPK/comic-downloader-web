# PHASE 01: Project Setup and Dependencies

## Goal
Initialize project structure, create backend with Puppeteer, configure frontend with React+Vite.

## Step 1.1: Create project directory structure

```bash
mkdir -p comic-downloader-web/backend/src/components comic-downloader-web/frontend/src/components comic-downloader-web/frontend/src/hooks
cd comic-downloader-web
ls -la
```

## Step 1.2: Initialize backend package.json

Create `backend/package.json` with exact content:

```json
{
  "name": "comic-downloader-backend",
  "version": "1.0.0",
  "description": "Comic scraping backend for comic site",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "puppeteer": "^21.6.1"
  }
}
```

## Step 1.3: Initialize frontend package.json

Create `frontend/package.json` with exact content:

```json
{
  "name": "comic-downloader-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.8",
    "file-saver": "^2.0.5",
    "jszip": "^3.10.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.1"
  }
}
```

## Step 1.4: Create backend/src directory structure

Run these commands:

```bash
mkdir -p comic-downloader-web/backend/src
touch comic-downloader-web/backend/src/scrape.js comic-downloader-web/backend/src/server.js
```

## Step 1.5: Create frontend/src directory structure

Run these commands:

```bash
mkdir -p comic-downloader-web/frontend/src/components comic-downloader-web/frontend/src/hooks comic-downloader-web/frontend/public
touch comic-downloader-web/frontend/index.html comic-downloader-web/frontend/vite.config.js
```

## Step 1.6: Install backend dependencies

```bash
cd comic-downloader-web/backend && npm install
```

## Step 1.7: Install frontend dependencies

```bash
cd comic-downloader-web/frontend && npm install
```

---

**Verify setup:** Check that both `backend/node_modules` and `frontend/node_modules` exist.
