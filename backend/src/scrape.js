const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

// Try to find Chrome executable dynamically
function findChromePath() {
  // Check environment variables first
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  // Try common paths
  const commonPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/render/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux/chrome',
  ];

  const fs = require('fs');
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  return undefined;
}

function extractComicId(url) {
  const match = url.match(/\/(\d+)-/);
  return match ? match[1] : null;
}

async function findReaderUrl(page) {
  return page.evaluate(() => {
    const btn =
      document.querySelector('a.page__btn-read[href*="/reader/"]') ||
      document.querySelector('a[href*="/reader/"]');
    return btn ? btn.href : null;
  });
}

async function scrapeComic(url) {
  const chromePath = findChromePath();
  console.log('[scrape] Using Chrome path:', chromePath || 'default Puppeteer path');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );

  const comicId = extractComicId(url);
  if (!comicId) {
    await browser.close();
    throw new Error('Could not extract comic ID from URL');
  }

  console.log(`[scrape] Starting scrape of ${url} (comic ID: ${comicId})`);

  // Step 1: Load detail page and clear the anti-bot challenge (/_c?t=...)
  console.log('[scrape] Loading comic detail page...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  let readerUrl = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.waitForSelector('a[href*="/reader/"]', { timeout: 20000 });
      readerUrl = await findReaderUrl(page);
      if (readerUrl) break;
    } catch (e) {
      console.log(`[scrape] Attempt ${attempt + 1}: reader link not ready (${e.message})`);
    }
    // Challenge may still be resolving; reload and retry
    await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  }

  // Extract comic title (after challenge cleared)
  let comicTitle = 'Unknown Comic';
  try {
    comicTitle = await page.evaluate(() => {
      const selectors = [
        'h1[class*="title"]',
        '[class*="page__title"]',
        '[class*="post-title"]',
        '[class*="comic-title"]',
        'h1',
        'title',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const txt = el && el.textContent ? el.textContent.trim() : '';
        if (txt && txt.length > 3 && !/BatCave\.biz/i.test(txt)) {
          return txt.substring(0, 80);
        }
      }
      return 'Unknown Comic';
    });
  } catch (e) {}

  if (!readerUrl) {
    const currentUrl = page.url();
    console.log(`[scrape] No reader link found. Current URL: ${currentUrl}`);
    try {
      await page.screenshot({ path: 'scrape-failure.png' });
      console.log('[scrape] Saved scrape-failure.png for inspection');
    } catch (e) {}
    await browser.close();
    throw new Error(
      'Could not find the "Start Reading" link. The site may be blocking access or the comic URL is invalid.'
    );
  }

  console.log(`[scrape] Reader URL: ${readerUrl}`);

  // Step 2: Load reader page (same page = challenge cookie persists)
  console.log('[scrape] Loading reader page...');
  await page.goto(readerUrl, { waitUntil: 'networkidle0', timeout: 60000 });

  const data = await page.evaluate(() => window.__DATA__ || null);

  if (!data) {
    console.log('[scrape] No window.__DATA__ found');
    await browser.close();
    return { comicTitle, chapters: [] };
  }

  // Build chapters array with metadata only (no images yet)
  const chapters = [];
  if (data.chapters && Array.isArray(data.chapters)) {
    for (const chapter of data.chapters) {
      chapters.push({
        title: chapter.title?.trim() || `Chapter ${chapter.id}`,
        url: `https://batcave.biz/reader/${comicId}/${chapter.id}`,
        chapterId: chapter.id,
      });
    }
  }

  await browser.close();
  return { comicTitle, chapters };
}

module.exports = { scrapeComic };
