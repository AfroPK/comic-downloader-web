# Comic Downloader

> A local-only web app for downloading comics as CBZ archives. Run it locally — no bundling needed.

---

## What It Does

Paste a comic URL, get a structured CBZ file. The backend scrapes the chapter list, downloads each page as an image, and bundles everything into a single archive organized by chapter.

**This project is designed to run locally on your machine.**

---

## Requirements

- [Node.js](https://nodejs.org/) 18+
- npm
- **Google Chrome installed** (required for Puppeteer scraping)

> **Important:** The app requires Google Chrome to be installed on your system.
> The app will automatically detect Chrome at the standard Windows paths:
> - `C:\Program Files\Google\Chrome\Application\chrome.exe`
> - `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
>
> If Chrome is installed elsewhere, set the `PUPPETEER_EXECUTABLE_PATH` environment variable
> in `backend/.env` to point to your Chrome executable.
>
> The app will NOT work without a Chrome/Chromium browser installed.

---

## Quick Start

### First Time Setup (run once)

```bash
git clone https://github.com/AfroPK/comic-downloader-web/
cd comic-downloader-web

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Run the app

**Windows:** Double-click `run.bat`

**Linux/Mac:**
```bash
chmod +x run.sh
./run.sh
```

Then open `http://localhost:5173` in your browser.

> **Note:** `run.bat` and `run.sh` **do not install dependencies** — you must run `npm install` first (see First Time Setup above).

### Configure allowed sites

Copy the example environment file and edit it:

```bash
cd backend
cp .env .env.local
```

Edit `.env.local`:

```env
PORT=3000
TARGET_SITES=https://example-comic-site.com
```

Replace `https://example-comic-site.com` with the site you want to use. Multiple sites can be comma-separated.

> **Note:** No sites are allowed by default. You must configure `TARGET_SITES` before scraping.

### 3. Start the backend

```bash
cd backend
npm start
```

The backend will run on `http://localhost:3000`.

### 4. Start the frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`.

### 5. Use the app

1. Open `http://localhost:5173` in your browser.
2. Paste a comic URL from a configured site.
3. Wait for chapters to load.
4. Download individual chapters or the full comic.

---

## Project Structure

```
comic-downloader-web/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express API
│   │   ├── scrape.js          # Generic comic scraper
│   │   ├── scrape-chapter.js  # Generic chapter scraper
│   │   ├── download-full.js   # Full comic downloader
│   │   ├── scrapers/
│   │   │   └── xoxocomic.js   # xoxocomic-specific scraper
│   │   └── config.js          # Allowed site configuration
│   └── .env                   # Local env template
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── hooks/useScrape.js
└── run.bat                  # Quick start script
```

---

## Custom Chromium Path

If Puppeteer cannot find your browser, set the path manually in `backend/.env`:

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

On Windows, use a path like:

```env
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

Supported browsers: **Google Chrome**, **Microsoft Edge**, **Brave Browser**.

---

## Troubleshooting

- **"URL not allowed"** — Add the site's origin to `TARGET_SITES` in `backend/.env.local`.
- **Download does nothing / scrape fails** — Make sure Google Chrome is installed. Puppeteer cannot launch without it.
- **"Puppeteer cannot launch"** — Chrome may be installed in a non-standard location. Set `PUPPETEER_EXECUTABLE_PATH` in `backend/.env`.
- **Frontend cannot reach backend** — Make sure the backend is running and `VITE_API_BASE_URL` points to the correct address.

---

## Security & Privacy

- This tool runs entirely on your local machine.
- No credentials, proxies, or deployment configuration are included.
- Only URLs matching `TARGET_SITES` are allowed.

---

## Disclaimer

**This tool is for personal use and educational purposes only.**

- Not affiliated with any comic hosting site.
- Respect the terms of service of any site you use this with.
- Only use this on sites you have permission to access.
- The authors assume no liability for misuse.

---

## License

MIT
