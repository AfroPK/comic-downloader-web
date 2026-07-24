const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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
  // Handle both absolute and relative URLs
  const urlStr = String(url || '');
  console.log(`[server] getScraper for: ${urlStr.substring(0, 80)}`);
  if (urlStr.includes('xoxocomic.com')) {
    console.log('[server] Using xoxocomic scraper');
    return { scrapeComic: scrapeComicXoxo, scrapeChapter: scrapeChapterXoxo };
  }
  console.log('[server] Using generic scraper');
  return { scrapeComic: scrapeComicGeneric, scrapeChapter: scrapeChapterGeneric };
}

// Start scrape job
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!isAllowedUrl(url)) {
    const allowedSites = require('./config').getAllowedSites();
    const allowedList = allowedSites.length > 0 ? allowedSites.join(', ') : 'none configured';
    return res.status(400).json({
      error: `URL not allowed. Allowed sites: ${allowedList}. Received: ${url}`,
    });
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
    const allowedSites = require('./config').getAllowedSites();
    const allowedList = allowedSites.length > 0 ? allowedSites.join(', ') : 'none configured';
    return res.status(400).json({
      error: `URL not allowed. Allowed sites: ${allowedList}. Received: ${chapterUrl}`,
    });
  }

  const jobId = Date.now().toString();
  jobs.set(jobId, { status: 'pending', result: null, error: null, progress: 0, total: 0 });

  res.json({ status: 'pending', jobId });

  try {
    const { scrapeChapter } = getScraper(chapterUrl);
    // Pass progress callback that updates job as images are collected
    const onProgress = (current, total) => {
      const job = jobs.get(jobId);
      if (job) {
        jobs.set(jobId, { ...job, progress: current, total });
      }
    };
    const result = await scrapeChapter(chapterUrl, onProgress);
    jobs.set(jobId, { status: 'done', result, error: null, progress: result.images.length, total: result.images.length });
  } catch (err) {
    console.error('[server] Chapter scrape error:', err);
    const job = jobs.get(jobId);
    jobs.set(jobId, { ...job, status: 'error', error: err.message });
  }
});

// Check chapter job status
app.get('/api/scrape-chapter/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  // If job is done or error, return it and immediately delete to free memory
  const response = { ...job };
  if (job.status === 'done' || job.status === 'error') {
    jobs.delete(req.params.jobId);
    console.log(`[server] Deleted job ${req.params.jobId} after fetch, freed ${job.result?.images?.length || 0} images`);
  }
  res.json(response);
});

// Full comic download - server-side with disk storage and single browser
const { ensureDir, sanitizeFileName, cleanupDir, downloadFullComic, TMP_DIR } = require('./download-full');

app.post('/api/download-full', async (req, res) => {
  const { comicUrl } = req.body;
  console.log(`[server] /api/download-full called with comicUrl: ${comicUrl}`);

  if (!comicUrl) {
    return res.status(400).json({ error: 'comicUrl is required' });
  }

  if (!isAllowedUrl(comicUrl)) {
    const allowedSites = require('./config').getAllowedSites();
    const allowedList = allowedSites.length > 0 ? allowedSites.join(', ') : 'none configured';
    return res.status(400).json({ error: `URL not allowed. Allowed sites: ${allowedList}` });
  }

  const jobId = Date.now().toString();
  const jobDir = path.join(TMP_DIR, 'comic-downloads', jobId);
  ensureDir(jobDir);

  jobs.set(jobId, { status: 'pending', type: 'download-full', filePath: null, error: null, comicUrl });
  res.json({ status: 'pending', jobId });

  // Run in background
  (async () => {
    try {
      // Step 1: Scrape comic info using existing scraper (handles session setup)
      jobs.set(jobId, { ...jobs.get(jobId), status: 'scraping-info' });

      // If comicUrl is a chapter URL, try to derive the comic URL
      let targetUrl = comicUrl;
      const urlStr = String(comicUrl || '');

      // Batcave chapter URL: https://batcave.biz/reader/33051/233702 -> comic URL
      const batcaveMatch = urlStr.match(/batcave\.biz\/reader\/(\d+)\/\d+/);
      if (batcaveMatch) {
        const comicId = batcaveMatch[1];
        targetUrl = `https://batcave.biz/${comicId}-`;
        console.log(`[server] Converted batcave chapter URL to comic URL: ${targetUrl}`);
      }

      const { scrapeComic } = getScraper(targetUrl);
      const comicInfo = await scrapeComic(targetUrl);

      if (!comicInfo.chapters || comicInfo.chapters.length === 0) {
        throw new Error('No chapters found');
      }

      // Step 2: Download all chapters using single browser + disk storage
      const result = await downloadFullComic(targetUrl, jobDir, (phase, current, total, detail) => {
        const job = jobs.get(jobId);
        if (!job) return;

        if (phase === 'downloading-chapters') {
          jobs.set(jobId, { ...job, status: 'downloading-chapters', currentChapter: current, totalChapters: total, chapterTitle: detail });
        } else if (phase === 'downloading-images') {
          jobs.set(jobId, { ...job, status: 'downloading-images', imageCurrent: current, imageTotal: total, chapterTitle: detail });
        } else if (phase === 'bundling') {
          jobs.set(jobId, { ...job, status: 'bundling' });
        }
      }, comicInfo);

      jobs.set(jobId, {
        status: 'done',
        type: 'download-full',
        filePath: result.filePath,
        fileName: result.fileName,
        comicTitle: result.comicTitle,
        error: null,
      });
    } catch (err) {
      console.error('[server] Full download error:', err);
      jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: err.message });
      cleanupDir(jobDir);
    }
  })();
});

// Check full download status
app.get('/api/download-full/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.type !== 'download-full') {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    status: job.status,
    currentChapter: job.currentChapter,
    totalChapters: job.totalChapters,
    chapterTitle: job.chapterTitle,
    imageCurrent: job.imageCurrent,
    imageTotal: job.imageTotal,
    fileName: job.fileName,
    error: job.error,
  });
});

// Serve downloaded file
app.get('/api/download-file/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.type !== 'download-full') {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (job.status !== 'done' || !job.filePath) {
    return res.status(400).json({ error: 'File not ready' });
  }

  const filePath = job.filePath;
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File no longer available' });
  }

  const fileName = job.fileName || 'download.zip';
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/zip');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);

  stream.on('close', () => {
    // Clean up after download
    try {
      const jobDir = path.dirname(filePath);
      cleanupDir(jobDir);
      jobs.delete(req.params.jobId);
      console.log(`[download-full] Cleaned up job ${req.params.jobId}`);
    } catch (e) {
      console.error('[download-full] Cleanup error:', e.message);
    }
  });

  stream.on('error', (err) => {
    console.error('[download-full] Stream error:', err.message);
    res.status(500).json({ error: 'Download failed' });
  });
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
