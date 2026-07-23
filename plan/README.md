# Comic Downloader - Build Phases

This project contains 6 phase files for building the comic downloader app.

## How to Execute

Execute the phases in ORDER by reading each file and running its commands:

```bash
cd /mnt/d/AIWorkspace/comic-downloader-web/plan

# Read Phase 1: Project Setup
cat PHASE_01_SETUP.md
# Then run the bash commands listed

# Read Phase 2: Create Scraper Module
cat PHASE_02_SCRAPER.md
# Then run the bash commands

# Read Phase 3: Create API Server
cat PHASE_03_SERVER.md
# Then run the bash commands

# Read Phase 4: Create Frontend Config
cat PHASE_04_CONFIG.md
# Then run the bash commands

# Read Phase 5: Create React Components
cat PHASE_05_REACT.md
# Then run the bash commands

# Read Phase 6: Run and Verify
cat PHASE_06_RUN.md
# Then run the setup commands
```

## Phase Files

| File | Description | Size |
|------|-------------|------|
| PHASE_01_SETUP.md | Create package.json, directory structure, install deps | ~2.2KB |
| PHASE_02_SCRAPER.md | Create Puppeteer scraper module for Cloudflare bypass | ~5KB |
| PHASE_03_SERVER.md | Create Express API server with scrape and image proxy endpoints | ~2.8KB |
| PHASE_04_CONFIG.md | Create Vite config, index.html, base frontend files | ~1.4KB |
| PHASE_05_REACT.md | Create all React components (App.jsx, CSS, hooks, UI components) | ~13KB |
| PHASE_06_RUN.md | Install deps, run dev server, test, troubleshoot | ~5.8KB |

## What Gets Built

After completing all phases you will have:

```
comic-downloader-web/
├── backend/           # Node.js + Express API server
│   ├── node_modules/  # Puppeteer for Cloudflare bypass
│   └── src/
│       ├── scrape.js  # Scrapes comic site pages
│       └── server.js  # API endpoints (/api/scrape, /api/image)
├── frontend/          # React + Vite SPA
│   ├── node_modules/  # JSZip, file-saver, React
│   ├── src/           # React components and hooks
│   └── vite.config.js # Auto-starts backend before dev server
└── plan/              # These phase files (reference only)
```

## Architecture

```
Browser UI (React port 5173)
    ↓ API calls /api/*
Backend Server (Node Express port 3000)
    ↓ Puppeteer browser automation
comic site (Cloudflare protected site)
    
Flow:
1. User enters comic site comic URL in browser
2. Frontend sends to backend via /api/scrape
3. Backend uses Puppeteer to bypass Cloudflare, scrape HTML
4. Backend extracts chapter links and image URLs from pages
5. Returns structured data to frontend
6. Frontend creates CBZ files client-side using JSZip
7. User downloads individual chapters or full comic
```

## Key Technologies

- **Puppeteer**: Bypasses Cloudflare by running headless Chrome
- **Express.js**: Lightweight Node.js API server
- **React + Vite**: Modern frontend with hot reload
- **JSZip**: Creates CBZ files in browser (client-side)
- **CORS**: Allows frontend to communicate with backend

## Running the App

After completing all phases:

```bash
cd comic-downloader-web/frontend
npm run dev
```

This will:
1. Start backend automatically on port 3000
2. Start frontend on port 5173
3. Open browser to http://localhost:5173

## Features

- ✅ Bypasses Cloudflare protection using Puppeteer
- ✅ Scrapes entire comic (all chapters and images)
- ✅ Downloads individual chapters as CBZ files
- ✅ Downloads full comic as single CBZ file
- ✅ Progress tracking during scraping
- ✅ Hotlink protection handling via image proxy
- ✅ Auto-starts backend from frontend

## Notes

- CBZ format = ZIP archive with ordered images (universal comic format)
- Backend runs headless Chromium automatically via Puppeteer
- Image proxy handles sites that block direct hotlinking
- Client-side CBZ creation means large files don't stream through server

---

Execute phases in order! Each phase is self-contained and can be run independently.
