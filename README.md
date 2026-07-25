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

### 1. Clone the repo

```bash
git clone https://github.com/AfroPK/comic-downloader-web/
cd comic-downloader-web
```

### 2. Install dependencies (run once)

**Windows:** Double-click `setup.bat`

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Configure allowed sites

Edit `backend/.env`:

```env
PORT=3000
TARGET_SITES=https://batcave.biz,https://example-comic-site.com
```

Replace with your site(s). Multiple sites are comma-separated — no spaces needed.

> **Note:** No sites are allowed by default. You must configure `TARGET_SITES` before scraping.

### 4. Run the app

**Windows:** Double-click `run.bat`

**Linux/Mac:**
```bash
chmod +x run.sh
./run.sh
```

### 5. Use the app

Open `http://localhost:5173` in your browser, paste a comic URL, and download.

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
├── run.bat                  # Quick start script (Windows)
├── run.sh                   # Quick start script (Linux/Mac)
├── setup.bat                # Install dependencies (Windows)
└── setup.sh                 # Install dependencies (Linux/Mac)
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
