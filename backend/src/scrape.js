const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

const path = require('path');
const fs = require('fs');

function getBaseUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    return '';
  }
}

function findExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const systemPaths = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  for (const p of systemPaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const executablePath = findExecutablePath();
const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, '../node_modules/.cache/puppeteer');

function extractComicId(url) {
  const match = url.match(/\/(\d+)-/);
  return match ? match[1] : null;
}

async function extractTitle(page) {
  return page.evaluate(() => {
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
      if (txt && txt.length > 3) {
        return txt.substring(0, 80);
      }
    }
    return 'Unknown Comic';
  });
}

async function scrapeComic(url) {
  const comicId = extractComicId(url);
  if (!comicId) {
    throw new Error('Could not extract comic ID from URL');
  }

  const baseUrl = getBaseUrl(url);
  console.log(`[scrape] Starting scrape of ${url} (comic ID: ${comicId})`);
  console.log('[scrape] Base URL:', baseUrl);
  console.log('[scrape] PROXY_HOST env:', process.env.PROXY_HOST || 'not set');

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote',
    '--disable-blink-features=AutomationControlled',
  ];

  const proxyHost = process.env.PROXY_HOST;
  if (proxyHost) {
    args.push(`--proxy-server=${proxyHost}`);
    console.log(`[scrape] Using proxy: ${proxyHost}`);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: executablePath,
    cacheDir: cacheDir,
    args: args,
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await browser.newPage();

  const proxyUsername = process.env.PROXY_USERNAME;
  const proxyPassword = process.env.PROXY_PASSWORD;
  if (proxyHost && proxyUsername && proxyPassword) {
    await page.authenticate({ username: proxyUsername, password: proxyPassword });
    console.log('[scrape] Proxy authentication configured');
  }

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': `${baseUrl}/`,
  });

  // Step 1: Visit homepage to establish session/cookies
  console.log('[scrape] Visiting homepage to establish session...');
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('[scrape] Homepage visit timed out, continuing');
  }

  // Step 2: Navigate to comic detail page
  console.log('[scrape] Loading comic detail page...');
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log('[scrape] Detail page goto timed out, continuing anyway');
  }
  await page.waitForTimeout(5000);

  const detailUrl = page.url();
  console.log('[scrape] Detail page URL:', detailUrl);

  let comicTitle = 'Unknown Comic';
  try {
    comicTitle = await extractTitle(page);
    console.log('[scrape] Page title:', comicTitle);
  } catch (e) {}

  // Step 3: Try to find reader link, or construct it
  let readerUrl = `${baseUrl}/reader/${comicId}`;
  try {
    const foundReader = await page.evaluate(() => {
      const el = document.querySelector('a[href*="/reader/"]');
      return el ? el.href : null;
    });
    if (foundReader) readerUrl = foundReader;
  } catch (e) {}

  console.log('[scrape] Reader URL:', readerUrl);

  // Step 4: Load reader page
  console.log('[scrape] Loading reader page...');
  try {
    await page.goto(readerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log('[scrape] Reader page goto timed out, continuing anyway');
  }
  await page.waitForTimeout(5000);

  const readerPageUrl = page.url();
  console.log('[scrape] Reader page URL:', readerPageUrl);

  const data = await page.evaluate(() => window.__DATA__ || null);

  if (!data) {
    console.log('[scrape] No window.__DATA__ found');
    await browser.close();
    return { comicTitle, chapters: [] };
  }

  const chapters = [];
  if (data.chapters && Array.isArray(data.chapters)) {
    for (const chapter of data.chapters) {
      chapters.push({
        title: chapter.title?.trim() || `Chapter ${chapter.id}`,
        url: `${baseUrl}/reader/${comicId}/${chapter.id}`,
        chapterId: chapter.id,
      });
    }
  }

  await browser.close();
  console.log(`[scrape] Found ${chapters.length} chapters`);
  return { comicTitle, chapters };
}

module.exports = { scrapeComic };
