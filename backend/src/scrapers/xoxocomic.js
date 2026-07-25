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
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function createBrowser() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote',
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-site-isolation-trials',
    '--disable-extensions',
    '--disable-plugins',
    '--window-size=1920,1080',
    '--start-maximized',
  ];

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
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(USER_AGENT);
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': `${BASE_URL}/`,
    'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
  });
  return page;
}

async function scrapeComic(url) {
  const browser = await createBrowser();
  const page = await setupPage(browser);

  try {
    console.log('[xoxocomic] Visiting homepage to establish session...');
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('[xoxocomic] Homepage visit timed out, continuing');
    }

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
      const chapterDivs = container.querySelectorAll('.chapter');
      return Array.from(chapterDivs).map(div => {
        const a = div.querySelector('a');
        return a ? {
          title: a.textContent.trim(),
          url: a.href,
        } : null;
      }).filter(ch => ch && ch.title && ch.url);
    });

    console.log(`[xoxocomic] Found ${chapters.length} chapters`);

    await browser.close();
    return { comicTitle, chapters };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

async function scrapeChapter(chapterUrl, onProgress) {
  const browser = await createBrowser();
  const page = await setupPage(browser);

  try {
    const allPagesUrl = chapterUrl.endsWith('/all') ? chapterUrl : `${chapterUrl}/all`;
    console.log(`[xoxocomic] Loading chapter (all pages): ${allPagesUrl}`);

    await page.goto(allPagesUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[data-original]');
      return Array.from(imgs).map(img => img.dataset.original).filter(src => src && src.length > 0);
    });

    console.log(`[xoxocomic] Found ${images.length} images on all-pages view`);

    if (images.length === 0) {
      await browser.close();
      throw new Error('No images found for this chapter');
    }

    if (onProgress) onProgress(0, images.length);

    const base64Images = [];
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    for (let i = 0; i < images.length; i++) {
      const imgUrl = images[i];
      try {
        const response = await fetch(imgUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': chapterUrl,
            'Cookie': cookieHeader,
            'User-Agent': USER_AGENT,
          },
        });

        if (!response.ok) {
          console.error(`[xoxocomic] Failed to fetch image ${i + 1}: HTTP ${response.status}`);
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 100) {
          console.error(`[xoxocomic] Image ${i + 1} too small`);
          continue;
        }

        const ct = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
        const b64 = buffer.toString('base64');
        base64Images.push(`data:${ct};base64,${b64}`);
        console.log(`[xoxocomic] Fetched image ${i + 1}/${images.length} (${buffer.length} bytes)`);

        if (onProgress) onProgress(base64Images.length, images.length);
      } catch (err) {
        console.error(`[xoxocomic] Error fetching image ${i + 1}:`, err.message);
      }
    }

    console.log(`[xoxocomic] Converted ${base64Images.length}/${images.length} images`);

    await browser.close();
    return { images: base64Images };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

module.exports = { scrapeComic, scrapeChapter };
