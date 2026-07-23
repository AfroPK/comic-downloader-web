const express = require('express');
const cors = require('cors');
const { scrapeComic } = require('./scrape');
const { scrapeChapter } = require('./scrape-chapter');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting for scrape endpoint
const scrapeAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_SCRAPE_PER_MINUTE = 5;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Scrape endpoint - handles comic scraping requests (metadata only)
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!url.includes('comic-site')) {
    return res.status(400).json({ error: 'Please provide a valid comic URL' });
  }

  // Rate limiting
  const clientKey = req.ip || 'unknown';
  const now = Date.now();
  const clientAttempts = scrapeAttempts.get(clientKey) || [];
  const recentAttempts = clientAttempts.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= MAX_SCRAPE_PER_MINUTE) {
    scrapeAttempts.set(clientKey, recentAttempts);
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment.',
      retryAfter: Math.ceil((recentAttempts[0] + RATE_LIMIT_WINDOW - now) / 1000),
    });
  }
  recentAttempts.push(now);
  scrapeAttempts.set(clientKey, recentAttempts);

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

// New endpoint - scrape a single chapter's images
app.post('/api/scrape-chapter', async (req, res) => {
  const { chapterUrl } = req.body;

  if (!chapterUrl) {
    return res.status(400).json({ error: 'Chapter URL is required' });
  }

  if (!chapterUrl.includes('comic-site')) {
    return res.status(400).json({ error: 'Please provide a valid chapter URL' });
  }

  try {
    const result = await scrapeChapter(chapterUrl);
    res.json({
      status: 'done',
      images: result.images,
    });
  } catch (err) {
    console.error('[server] Chapter scrape error:', err);
    res.status(500).json({
      status: 'error',
      error: err.message || 'Chapter scraping failed',
    });
  }
});

app.listen(PORT, () => {
  console.log(`[server] Backend running on http://localhost:${PORT}`);
});
