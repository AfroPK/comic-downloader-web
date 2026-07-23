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
    require('path').join(__dirname, '..', 'node_modules', '.puppeteer', 'chrome', 'linux-121.0.6167.85', 'chrome-linux', 'chrome'),
  ];

  const fs = require('fs');
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  return undefined;
}

async function scrapeChapter(chapterUrl) {
  const chromePath = findChromePath();
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || require('path').join(__dirname, '..', 'node_modules', '.puppeteer');
  console.log('[scrape-chapter] Using Chrome path:', chromePath || 'default Puppeteer path');
  console.log('[scrape-chapter] Using Puppeteer cache dir:', cacheDir);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    cacheDir: cacheDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );

  console.log(`[scrape-chapter] Loading ${chapterUrl}`);

  // Visit batcave.biz first to establish cookies (clear anti-bot challenge)
  await page.goto('https://batcave.biz/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Navigate to chapter
  await page.goto(chapterUrl, { waitUntil: 'networkidle0', timeout: 60000 });

  const chapterData = await page.evaluate(() => window.__DATA__ || null);
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
