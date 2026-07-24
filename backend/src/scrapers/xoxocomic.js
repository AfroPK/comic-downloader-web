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

// Rotate user agents to avoid fingerprinting
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.67',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

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

  // Randomize viewport slightly to avoid fingerprinting
  const width = 1920 + Math.floor(Math.random() * 100);
  const height = 1080 + Math.floor(Math.random() * 100);
  await page.setViewport({ width, height });

  await page.setUserAgent(getRandomUserAgent());
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

  // Override navigator.webdriver to false
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
  });

  return page;
}

function isBlockedPage(title, html) {
  const blockedIndicators = [
    'is blocked',
    'blocked',
    'access denied',
    'forbidden',
    'cloudflare',
    'captcha',
    'ddos',
    'security check',
  ];
  const lowerTitle = title.toLowerCase();
  const lowerHtml = html.toLowerCase();
  return blockedIndicators.some(ind => lowerTitle.includes(ind) || lowerHtml.includes(ind));
}

async function scrapeComic(url, retryCount = 0) {
  const maxRetries = 2;
  const browser = await createBrowser();
  const page = await setupPage(browser);

  try {
    // Step 1: Visit homepage to warm up session
    console.log('[xoxocomic] Visiting homepage to establish session...');
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000 + Math.random() * 2000);
    } catch (e) {
      console.log('[xoxocomic] Homepage visit timed out, continuing');
    }

    // Step 2: Navigate to comic page
    console.log(`[xoxocomic] Loading comic page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000 + Math.random() * 2000);

    const comicTitle = await page.evaluate(() => {
      const titleEl = document.querySelector('h1');
      return titleEl ? titleEl.textContent.trim() : 'Unknown Comic';
    });

    const pageHtml = await page.evaluate(() => document.documentElement.innerHTML.substring(0, 500));
    console.log(`[xoxocomic] Comic title: ${comicTitle}`);

    // Check if blocked
    if (isBlockedPage(comicTitle, pageHtml)) {
      await browser.close();
      if (retryCount < maxRetries) {
        console.log(`[xoxocomic] Blocked detected, retrying (${retryCount + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
        return scrapeComic(url, retryCount + 1);
      }
      throw new Error('Access blocked by xoxocomic. Please try again later.');
    }

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
    if (retryCount < maxRetries && err.message.includes('blocked')) {
      console.log(`[xoxocomic] Retrying after error (${retryCount + 1}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
      return scrapeComic(url, retryCount + 1);
    }
    throw err;
  }
}

async function scrapeChapter(chapterUrl, retryCount = 0) {
  const maxRetries = 2;
  const browser = await createBrowser();
  const page = await setupPage(browser);

  try {
    console.log(`[xoxocomic] Loading chapter: ${chapterUrl}`);

    // First, get the total page count
    await page.goto(chapterUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000 + Math.random() * 2000);

    const pageHtml = await page.evaluate(() => document.documentElement.innerHTML.substring(0, 500));
    const pageTitle = await page.evaluate(() => document.title);

    // Check if blocked
    if (isBlockedPage(pageTitle, pageHtml)) {
      await browser.close();
      if (retryCount < maxRetries) {
        console.log(`[xoxocomic] Chapter blocked, retrying (${retryCount + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
        return scrapeChapter(chapterUrl, retryCount + 1);
      }
      throw new Error('Access blocked by xoxocomic. Please try again later.');
    }

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
        await page.waitForTimeout(2000 + Math.random() * 1000);
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
            'User-Agent': getRandomUserAgent(),
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
    if (retryCount < maxRetries && (err.message.includes('blocked') || err.message.includes('timeout'))) {
      console.log(`[xoxocomic] Retrying chapter after error (${retryCount + 1}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
      return scrapeChapter(chapterUrl, retryCount + 1);
    }
    throw err;
  }
}

module.exports = { scrapeComic, scrapeChapter };
