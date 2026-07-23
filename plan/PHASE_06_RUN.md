# PHASE 06: Run Instructions and Verification

## Goal
Complete setup, install dependencies, run the app, and verify everything works.

## Step 1: Install backend dependencies

Run this command from the project root:

```bash
cd comic-downloader-web/backend && npm install
```

This will download puppeteer (which may take a few minutes to download Chromium).

Verify installation succeeded:

```bash
ls -la comic-downloader-web/backend/node_modules | head -10
```

## Step 2: Install frontend dependencies

Run this command from the project root:

```bash
cd comic-downloader-web/frontend && npm install
```

This will download React, JSZip, and other frontend dependencies.

Verify installation succeeded:

```bash
ls -la comic-downloader-web/frontend/node_modules | head -10
```

## Step 3: Run the application

From the project root:

```bash
cd comic-downloader-web/frontend && npm run dev
```

This will:
1. Auto-start the backend server on port 3000 (via Vite plugin)
2. Start the frontend dev server on port 5173
3. Open your browser automatically to http://localhost:5173

## Step 4: Verify both servers are running

In a new terminal window or after the dev server starts, you should see output like:

```
[server] Backend running on http://localhost:3000
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Step 5: Test the scraper API directly (optional)

You can test the backend before using it from the frontend. In a new terminal:

```bash
# Start backend first
cd comic-downloader-web/backend
npm start

# Then test with curl (in another terminal):
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://batcave.biz/example-comic/"}'
```

You'll need to replace the URL with an actual batcave.biz comic URL.

## Step 6: Using the app from browser

1. Open http://localhost:5173 in your browser
2. Enter a batcave.biz comic URL (e.g., `https://batcave.biz/some-comic-name/`)
3. Click "Download" button
4. Wait for scraping to complete (progress bar shows status)
5. Once complete, you'll see:
   - List of chapters with individual CBZ download buttons
   - "Full Comic" CBZ download button
6. Click any CBZ button to download

## Step 7: Troubleshooting

### Issue: Puppeteer failed to launch

If you see an error about puppeteer failing to launch Chromium, run:

```bash
cd comic-downloader-web/backend
npm install --save-dev @puppeteer/browsers
```

Or manually download Chromium:

```bash
cd /tmp && wget https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/1209577/chrome-linux.zip
unzip chrome-linux.zip -d /tmp/chrome-linux
export PATH="/tmp/chrome-linux:$PATH"
npm install puppeteer
```

Then edit `backend/src/scrape.js` line 3 to use the system path:

```javascript
const puppeteer = require('puppeteer');
// ... later in scrapeComic function, change to:
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: '/tmp/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
```

### Issue: Cloudflare still blocking

If scraping fails, try running the scraper manually to see console output:

```bash
cd comic-downloader-web/backend
node -e "require('./src/scrape').scrapeComic('https://batcave.biz/your-comic-url/').then(console.log)"
```

Check what errors appear and adjust accordingly.

### Issue: Images not loading

The image proxy endpoint may fail if the site has anti-hotlink protection. You can try increasing the User-Agent complexity or adding more headers to `backend/src/server.js` in the `/api/image` route.

## Step 8: Build for production (optional)

Once everything works, build the frontend:

```bash
cd comic-downloader-web/frontend && npm run build
```

This creates a `dist/` folder with the production build. You can then deploy this alongside the backend server.

## Complete file structure after setup

```
comic-downloader-web/
├── backend/
│   ├── node_modules/
│   └── src/
│       ├── scrape.js          [Phase 02]
│       └── server.js           [Phase 03]
├── frontend/
│   ├── node_modules/
│   ├── dist/                  [built output]
│   ├── index.html             [Phase 04]
│   ├── package.json           [Phase 01]
│   └── src/
│       ├── main.jsx           [Phase 05]
│       ├── App.jsx            [Phase 05]
│       ├── index.css          [Phase 05]
│       ├── components/
│       │   ├── UrlInput.jsx   [Phase 05]
│       │   ├── ProgressPanel.jsx   [Phase 05]
│       │   ├── ChapterList.jsx [Phase 05]
│       │   └── FullDownloadSection.jsx [Phase 05]
│       └── hooks/
│           └── useScrape.js   [Phase 05]
└── plan/
    ├── PHASE_README.md        [Summary]
    ├── PHASE_01_SETUP.md      [Phase 1]
    ├── PHASE_02_SCRAPER.md    [Phase 2]
    ├── PHASE_03_SERVER.md     [Phase 3]
    ├── PHASE_04_CONFIG.md     [Phase 4]
    ├── PHASE_05_REACT.md      [Phase 5]
    └── PHASE_06_RUN.md        [Phase 6 - this file]
```

## Summary of what you have built

1. **Backend API** (port 3000):
   - `/api/scrape` - Scrapes batcave.biz comic pages, bypasses Cloudflare, extracts chapter/image data
   - `/api/image` - Proxies images with proper headers for hotlink protection
   
2. **Frontend UI** (port 5173):
   - URL input field for entering comic links
   - Progress indicator during scraping
   - Chapter list with individual CBZ download buttons
   - Full comic download button

3. **Auto-start**: Backend starts automatically when you run `npm run dev` in frontend directory

4. **CBZ creation**: Uses client-side JSZip to create standard ZIP archives that work with all comic readers

## Next steps

Once everything is working:
1. Test with real batcave.biz URLs
2. Try downloading individual chapters vs full comic
3. Consider adding features like chapter sorting, progress persistence, or concurrent downloads
