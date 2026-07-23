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

async function scrapeChapter(chapterUrl) {
  console.log('[scrape-chapter] Using Chrome path:', executablePath || 'default Puppeteer path');

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
    console.log(`[scrape-chapter] Using proxy: ${proxyHost}`);
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
    console.log('[scrape-chapter] Proxy authentication configured');
  }

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': 'https://batcave.biz/',
  });

  console.log(`[scrape-chapter] Loading ${chapterUrl}`);

  // Visit batcave.biz first to establish cookies
  try {
    await page.goto('https://batcave.biz/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('[scrape-chapter] Homepage visit timed out, continuing');
  }

  // Navigate to chapter
  try {
    await page.goto(chapterUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log('[scrape-chapter] Chapter page goto timed out, continuing anyway');
  }
  await page.waitForTimeout(5000);

  const chapterData = await page.evaluate(() => window.__DATA__ || null);
  console.log('[scrape-chapter] Current page URL:', page.url());
  console.log('[scrape-chapter] window.__DATA__:', chapterData ? 'found' : 'not found');

  if (!chapterData || !Array.isArray(chapterData.images)) {
    await browser.close();
    throw new Error('No images found for this chapter');
  }

  console.log(`[scrape-chapter] Found ${chapterData.images.length} images`);
  console.log('[scrape-chapter] First image URL:', chapterData.images[0]);

  // Collect images by fetching them directly via page.evaluate
  const base64Images = [];
  const failedImages = [];

  for (let i = 0; i < chapterData.images.length; i++) {
    const imgUrl = chapterData.images[i];
    try {
      // Try to fetch image through the browser context (uses existing cookies/session)
      const result = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Referer': window.location.href,
            },
          });
          if (!response.ok) {
            return { ok: false, status: response.status };
          }
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          return {
            ok: true,
            base64,
            contentType: response.headers.get('content-type') || 'image/jpeg',
          };
        } catch (err) {
          return { ok: false, error: err.message };
        }
      }, imgUrl);

      if (result.ok) {
        const ct = (result.contentType || 'image/jpeg').split(';')[0];
        base64Images.push(`data:${ct};base64,${result.base64}`);
        console.log(`[scrape-chapter] Fetched image ${i + 1}/${chapterData.images.length}`);
      } else {
        console.error(`[scrape-chapter] Failed to fetch image ${i + 1}:`, result.status || result.error);
        failedImages.push(imgUrl);
      }
    } catch (err) {
      console.error(`[scrape-chapter] Error fetching image ${i + 1}:`, err.message);
      failedImages.push(imgUrl);
    }
  }

  console.log(`[scrape-chapter] Converted ${base64Images.length}/${chapterData.images.length} images`);
  if (failedImages.length > 0) {
    console.log(`[scrape-chapter] Failed images: ${failedImages.length}`);
  }

  await browser.close();
  return { images: base64Images };
}

module.exports = { scrapeChapter };
