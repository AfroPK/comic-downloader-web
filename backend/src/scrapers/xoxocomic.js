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
const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, '../../node_modules/.cache/puppeteer');

const BASE_URL = 'https://xoxocomic.com';

async function createBrowser() {
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
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: executablePath,
    cacheDir: cacheDir,
    args: args,
    ignoreDefaultArgs: ['--enable-automation'],
  });

  return browser;
}

async function setupPage(browser) {
  const page = await browser.newPage();

  const proxyUsername = process.env.PROXY_USERNAME;
  const proxyPassword = process.env.PROXY_PASSWORD;
  const proxyHost = process.env.PROXY_HOST;
  if (proxyHost && proxyUsername && proxyPassword) {
    await page.authenticate({ username: proxyUsername, password: proxyPassword });
  }

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': `${BASE_URL}/`,
  });

  return page;
}

async function scrapeComic(url) {
  const browser = await createBrowser();
  const page = await setupPage(browser);

  try {
    console.log(`[xoxocomic] Loading comic page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    const comicTitle = await page.evaluate(() => {
      const titleEl = document.querySelector('h1');
      return titleEl ? titleEl.textContent.trim() : 'Unknown Comic';
    });

    console.log(`[xoxocomic] Comic title: ${comicTitle}`);

    const chapters = await page.evaluate(() => {
      const container = document.getElementById('nt_listchapter');
      if (!container) return [];

      const links = container.querySelectorAll('a');
      return Array.from(links).map(a => ({
        title: a.textContent.trim(),
        url: a.href,
      })).filter(ch => ch.title && ch.url);
    });

    console.log(`[xoxocomic] Found ${chapters.length} chapters`);

    await browser.close();
    return { comicTitle, chapters };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

async function scrapeChapter(chapterUrl) {
  const browser = await createBrowser();
  const page = await setupPage(browser);

  try {
    console.log(`[xoxocomic] Loading chapter: ${chapterUrl}`);

    // First, get the total page count
    await page.goto(chapterUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    const pageInfo = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      const totalMatch = html.match(/of\s+(\d+)/);
      const totalPages = totalMatch ? parseInt(totalMatch[1]) : 1;
      return { totalPages };
    });

    console.log(`[xoxocomic] Total pages: ${pageInfo.totalPages}`);

    const images = [];

    // Collect images from all pages
    for (let pageNum = 1; pageNum <= pageInfo.totalPages; pageNum++) {
      const pageUrl = pageNum === 1 ? chapterUrl : `${chapterUrl}/${pageNum}`;

      if (pageNum > 1) {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(2000);
      }

      const imgData = await page.evaluate(() => {
        const img = document.querySelector('img[data-original]');
        if (img) {
          return {
            src: img.dataset.original,
            alt: img.alt,
          };
        }
        return null;
      });

      if (imgData) {
        images.push(imgData.src);
        console.log(`[xoxocomic] Found image ${pageNum}/${pageInfo.totalPages}`);
      }
    }

    console.log(`[xoxocomic] Collected ${images.length} images`);

    // Download images
    const base64Images = [];
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    for (const imgUrl of images) {
      try {
        const response = await fetch(imgUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': chapterUrl,
            'Cookie': cookieHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 100) continue;

        const ct = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
        const b64 = buffer.toString('base64');
        base64Images.push(`data:${ct};base64,${b64}`);
      } catch (err) {
        console.error(`[xoxocomic] Failed to fetch image: ${err.message}`);
      }
    }

    await browser.close();
    return { images: base64Images };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

module.exports = { scrapeComic, scrapeChapter };
