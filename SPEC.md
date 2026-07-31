# SPEC.md — Repository Specification

## Project Overview
Comic Downloader Web enables users to scrape, download, and compile comic pages into CBZ/ZIP archives or PDFs through a clean local web interface.

## Target Architecture
- **Backend Service**:
  - Express API server on Node.js.
  - Puppeteer headless browser instance for bypassing Cloudflare/anti-bot protection and extracting image assets.
  - Express endpoints for initiating scraping, monitoring progress, and serving compiled files.
- **Frontend App**:
  - React + Vite SPA.
  - Real-time progress updates and log stream during download jobs.

## Pinned Dependencies
- Node.js >= 18.0.0
- React 18.3.x
- Vite 5.4.x
- Express 4.18.x
- Puppeteer 21.6.x

## Non-Goals
- Multi-user authentication / cloud hosting.
- Bypassing paid paywalls or pirating private content without permission.

## Acceptance Criteria
- [ ] Backend starts without error and health check endpoint returns 200 OK.
- [ ] Frontend builds cleanly with zero errors (`vite build`).
- [ ] Scraper extracts images and bundles them reliably into downloadable archives.
- [ ] UI provides real-time progress indicators and clear error reporting.
