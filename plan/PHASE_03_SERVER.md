# PHASE 03: Create Backend API Server

## Goal
Create the Express server with scraping endpoint and image proxy.

## Step 1: Create server.js with exact content

Write this EXACT code to `comic-downloader-web/backend/src/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const { scrapeComic } = require('./scrape');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Scrape endpoint - handles comic scraping requests
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!url.includes('comic site')) {
    return res.status(400).json({ error: 'Please provide a comic site URL' });
  }

  try {
    const result = await scrapeComic(url);
    
    res.json({
      status: 'done',
      comicTitle: result.comicTitle,
      chapters: result.chapters,
    });
  } catch (err) {
    console.error('[server] Scrape error:', err);
    res.status(500).json({
      status: 'error',
      error: err.message || 'Scraping failed',
    });
  }
});

// Image proxy endpoint - handles hotlink protection
app.get('/api/image', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const decodedUrl = Buffer.from(url, 'base64').toString('utf-8');

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://example-comic-site.com/',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Image fetch failed: ${response.status}` });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    res.set('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  } catch (err) {
    console.error('[server] Image proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] Backend running on http://localhost:${PORT}`);
});
```

## Step 2: Verify server.js was created correctly

Run this command:

```bash
head -30 comic-downloader-web/backend/src/server.js
```

You should see the first 30 lines of the server.js file.

---

**Both backend files (scrape.js and server.js) are now complete.** You can test them individually later if needed, but they will be started automatically by the frontend dev server.
