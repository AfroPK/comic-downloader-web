const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

const path = require('path');
const fs = require('fs');

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
      if (txt && txt.length > 3 && !/BatCave\.biz/i.test(txt)) {
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

  console.log(`[scrape] Starting scrape of ${url} (comic ID: ${comicId})`);
  console.log('[scrape] PROXY_HOST env:', process.env.PROXY_HOST || 'not set');
  console.log('[scrape] PROXY_USERNAME env:', process.env.PROXY_USERNAME ? 'set' : 'not set');
  console.log('[scrape] PROXY_PASSWORD env:', process.env.PROXY_PASSWORD ? 'set' : 'not set');

  // Build Puppeteer launch args
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote',
    '--disable-blink-features=AutomationControlled',
  ];

  // Add proxy if configured via environment variables
  // Format: PROXY_HOST=host:port, PROXY_USERNAME=user, PROXY_PASSWORD=pass
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

  // Authenticate proxy if credentials provided
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

  // Intercept API responses to find chapter data
  let apiData = null;
  page.on('response', async (response) => {
    const respUrl = response.url();
    if (respUrl.includes('api') || respUrl.includes('reader') || respUrl.includes('chapter')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          if (json && (json.chapters || json.data)) {
            apiData = json;
            console.log('[scrape] Found API data from:', respUrl);
          }
        }
      } catch (e) {}
    }
  });

  // Go directly to reader URL
  const readerUrl = `https://batcave.biz/reader/${comicId}`;
  console.log(`[scrape] Loading reader URL directly: ${readerUrl}`);

  try {
    await page.goto(readerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log('[scrape] Reader page goto timed out, continuing anyway');
  }

  await page.waitForTimeout(5000);

  // Debug: log page info
  const pageUrl = page.url();
  console.log('[scrape] Current page URL:', pageUrl);

  let comicTitle = 'Unknown Comic';
  try {
    comicTitle = await extractTitle(page);
    console.log('[scrape] Page title:', comicTitle);
  } catch (e) {}

  // Try to get data from multiple sources
  let data = await page.evaluate(() => window.__DATA__ || null);

  if (!data && apiData) {
    data = apiData.data || apiData;
  }

  // Try to extract from script tags
  if (!data) {
    try {
      const scriptData = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent || '';
          if (text.includes('__DATA__') || text.includes('chapters')) {
            return text.substring(0, 500);
          }
        }
        return null;
      });
      console.log('[scrape] Script data sample:', scriptData);
    } catch (e) {}
  }

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
        url: `https://batcave.biz/reader/${comicId}/${chapter.id}`,
        chapterId: chapter.id,
      });
    }
  }

  await browser.close();
  console.log(`[scrape] Found ${chapters.length} chapters`);
  return { comicTitle, chapters };
}

module.exports = { scrapeComic };
