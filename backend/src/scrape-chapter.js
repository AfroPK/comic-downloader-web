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

  const imageBuffers = new Map();
  const contentTypeMap = new Map();

  const onResponse = async (response) => {
    const respUrl = response.url();
    if (respUrl.startsWith('https://img.batcave.biz/img/') && respUrl.endsWith('.jpg')) {
      try {
        const buffer = await response.buffer();
        if (buffer.length > 100) {
          imageBuffers.set(respUrl, buffer);
          contentTypeMap.set(respUrl, response.headers()['content-type'] || 'image/jpeg');
        }
      } catch (e) {}
    }
  };

  page.on('response', onResponse);

  // Force lazy images to load
  await page.evaluate((imageUrls) => {
    const imgs = document.querySelectorAll('img.reader__item');
    imageUrls.forEach((src) => {
      for (let j = 0; j < imgs.length; j++) {
        const cur = imgs[j].getAttribute('src');
        if (!cur || cur.includes('loading.gif')) {
          imgs[j].setAttribute('src', src);
          imgs[j].removeAttribute('loading');
          break;
        }
      }
    });
  }, chapterData.images);

  // Wait for images to load
  for (let w = 0; w < 40; w++) {
    await new Promise((r) => setTimeout(r, 500));
    if (imageBuffers.size >= Math.floor(chapterData.images.length * 0.9)) break;
  }

  console.log(`[scrape-chapter] Collected ${imageBuffers.size} images`);

  const base64Images = [];
  for (const imgUrl of chapterData.images) {
    const buf = imageBuffers.get(imgUrl);
    if (buf && buf.length > 0) {
      try {
        const ct = (contentTypeMap.get(imgUrl) || 'image/jpeg').split(';')[0];
        const b64 = buf.toString('base64');
        base64Images.push(`data:${ct};base64,${b64}`);
      } catch (err) {
        console.error(`[scrape-chapter] Failed to convert image: ${err.message}`);
      }
    }
  }

  await browser.close();
  return { images: base64Images };
}

module.exports = { scrapeChapter };
