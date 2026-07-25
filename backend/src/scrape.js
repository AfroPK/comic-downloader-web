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
  // Windows Chrome paths
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\' + (process.env.USERNAME || '') + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of winPaths) {
    if (fs.existsSync(p)) return p;
  }
  // Linux paths
  const linuxPaths = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  for (const p of linuxPaths) {
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
    // Try common title selectors
    const selectors = [
      'h1[class*="title"]',
      'h1[class*="Title"]',
      '[class*="page__title"]',
      '[class*="post-title"]',
      '[class*="comic-title"]',
      '[class*="ComicTitle"]',
      '[class*="comic-title"]',
      'h1',
      'title',
      'meta[property="og:title"]',
      'meta[name="og:title"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      let txt = '';
      if (el.getAttribute) {
        txt = el.getAttribute('content') || el.getAttribute('value') || el.textContent || '';
      } else {
        txt = el.textContent || '';
      }
      txt = (txt || '').trim();
      if (txt && txt.length > 3) {
        return txt.substring(0, 80);
      }
    }
    return null;
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

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote',
    '--disable-blink-features=AutomationControlled',
  ];

  if (!executablePath) {
    console.log('[scrape] No Chrome/Chromium found, using bundled Chromium');
  } else {
    console.log('[scrape] Using Chrome at:', executablePath);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: executablePath,
    cacheDir: cacheDir,
    args: args,
    ignoreDefaultArgs: ['--enable-automation'],
    timeout: 30000,
    slowMo: 0,
  });

  const page = await browser.newPage();

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

  let comicTitle = null;
  try {
    comicTitle = await extractTitle(page);
    console.log('[scrape] Page title:', comicTitle);
  } catch (e) {}

  // Fallback: extract from URL slug
  if (!comicTitle) {
    const slugMatch = url.match(/\/\d+-(.+?)\.html?/i);
    if (slugMatch) {
      comicTitle = slugMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } else {
      comicTitle = 'Unknown Comic';
    }
    console.log('[scrape] Fallback title from URL:', comicTitle);
  }

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
      const chapterId = chapter.id || chapter.chapterId || chapter.slug || chapter.slugId;
      if (!chapterId) {
        console.log('[scrape] Skipping chapter without ID:', chapter);
        continue;
      }
      chapters.push({
        title: chapter.title?.trim() || `Chapter ${chapterId}`,
        url: `${baseUrl}/reader/${comicId}/${chapterId}`,
        chapterId: chapterId,
      });
    }
  }
  // If no chapters found from __DATA__, try extracting from page links
  if (chapters.length === 0) {
    const pageChapters = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/reader/"]'));
      return links.map(a => ({
        title: a.textContent?.trim() || '',
        url: a.href,
      }));
    });
    if (pageChapters.length > 0) {
      return { comicTitle, chapters: pageChapters };
    }
  }

  await browser.close();
  console.log(`[scrape] Found ${chapters.length} chapters`);
  return { comicTitle, chapters };
}

module.exports = { scrapeComic };
