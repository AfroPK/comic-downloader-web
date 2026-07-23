const express = require('express');
const cors = require('cors');
const { scrapeComic: scrapeComicGeneric } = require('./scrape');
const { scrapeChapter: scrapeChapterGeneric } = require('./scrape-chapter');
const { scrapeComic: scrapeComicXoxo, scrapeChapter: scrapeChapterXoxo } = require('./scrapers/xoxocomic');
const { isAllowedUrl } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory job storage (use Redis in production)
const jobs = new Map();

// Rate limiting
const scrapeAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_SCRAPE_PER_MINUTE = 5;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check - must respond quickly for Render
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Determine which scraper to use based on URL
function getScraper(url) {
  if (url.includes('xoxocomic.com')) {
    return { scrapeComic: scrapeComicXoxo, scrapeChapter: scrapeChapterXoxo };
  }
  return { scrapeComic: scrapeComicGeneric, scrapeChapter: scrapeChapterGeneric };
}

// Start scrape job
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!isAllowedUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid comic URL' });
  }

  // Rate limiting
  const clientKey = req.ip || 'unknown';
  const now = Date.now();
  const clientAttempts = scrapeAttempts.get(clientKey) || [];
  const recentAttempts = clientAttempts.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= MAX_SCRAPE_PER_MINUTE) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment.',
    });
  }
  recentAttempts.push(now);
  scrapeAttempts.set(clientKey, recentAttempts);

  // Create job
  const jobId = Date.now().toString();
  jobs.set(jobId, { status: 'pending', result: null, error: null });

  // Respond immediately with job ID
  res.json({ status: 'pending', jobId });

  // Run scrape in background with appropriate scraper
  try {
    const { scrapeComic } = getScraper(url);
    const result = await scrapeComic(url);
    jobs.set(jobId, { status: 'done', result, error: null });
  } catch (err) {
    console.error('[server] Scrape error:', err);
    jobs.set(jobId, { status: 'error', result: null, error: err.message });
  }
});

// Check job status
app.get('/api/scrape/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Scrape chapter
app.post('/api/scrape-chapter', async (req, res) => {
  const { chapterUrl } = req.body;

  if (!chapterUrl) {
    return res.status(400).json({ error: 'Chapter URL is required' });
  }

  if (!isAllowedUrl(chapterUrl)) {
    return res.status(400).json({ error: 'Please provide a valid chapter URL' });
  }

  const jobId = Date.now().toString();
  jobs.set(jobId, { status: 'pending', result: null, error: null });

  res.json({ status: 'pending', jobId });

  try {
    const { scrapeChapter } = getScraper(chapterUrl);
    const result = await scrapeChapter(chapterUrl);
    jobs.set(jobId, { status: 'done', result, error: null });
  } catch (err) {
    console.error('[server] Chapter scrape error:', err);
    jobs.set(jobId, { status: 'error', result: null, error: err.message });
  }
});

// Check chapter job status
app.get('/api/scrape-chapter/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Cleanup old jobs every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes
  for (const [jobId, job] of jobs) {
    if (parseInt(jobId) < cutoff) {
      jobs.delete(jobId);
    }
  }
}, 10 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`[server] Backend running on http://localhost:${PORT}`);
});
