const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

const TMP_DIR = process.env.TMPDIR || '/tmp';

// User agents
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.67',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeFileName(str) {
  return str.replace(/[^a-zA-Z0-9#]/g, '');
}

function cleanupDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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

async function setupPage(browser, referer) {
  const page = await browser.newPage();

  const proxyUsername = process.env.PROXY_USERNAME;
  const proxyPassword = process.env.PROXY_PASSWORD;
  const proxyHost = process.env.PROXY_HOST;
  if (proxyHost && proxyUsername && proxyPassword) {
    await page.authenticate({ username: proxyUsername, password: proxyPassword });
  }

  const width = 1920 + Math.floor(Math.random() * 100);
  const height = 1080 + Math.floor(Math.random() * 100);
  await page.setViewport({ width, height });

  await page.setUserAgent(getRandomUserAgent());
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': referer || 'https://xoxocomic.com/',
    'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
  });

  // Block unnecessary resources to save memory
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
      req.abort();
    } else {
      req.continue();
    }
  });

  return page;
}

// Extract image URLs from a chapter page using an existing browser/page
async function extractChapterImageUrls(page, chapterUrl, isXoxo) {
  if (isXoxo) {
    const allPagesUrl = chapterUrl.endsWith('/all') ? chapterUrl : `${chapterUrl}/all`;
    await page.goto(allPagesUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000 + Math.random() * 2000);

    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[data-original]');
      return Array.from(imgs).map(img => img.dataset.original).filter(src => src && src.length > 0);
    });

    return images;
  } else {
    // Generic/batcave scraper approach
    await page.goto(chapterUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Try to get window.__DATA__
    let chapterData = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.waitForTimeout(1000);
      chapterData = await page.evaluate(() => window.__DATA__ || null);
      if (chapterData && Array.isArray(chapterData.images)) {
        break;
      }
    }

    if (!chapterData || !Array.isArray(chapterData.images)) {
      throw new Error('No images found for this chapter');
    }

    return chapterData.images;
  }
}

// Download images via plain HTTP and write to disk
async function downloadImagesToDisk(imageUrls, outputDir, referer, cookieHeader, onProgress) {
  ensureDir(outputDir);
  const downloaded = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imgUrl = imageUrls[i];
    try {
      const response = await fetch(imgUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': referer,
          'Cookie': cookieHeader || '',
          'User-Agent': getRandomUserAgent(),
        },
      });

      if (!response.ok) {
        console.error(`[download-full] Failed to fetch image ${i + 1}: HTTP ${response.status}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 100) {
        console.error(`[download-full] Image ${i + 1} too small`);
        continue;
      }

      const ct = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
      const ext = ct.split('/')[1] || 'jpg';
      const fileName = `page_${String(i + 1).padStart(3, '0')}.${ext}`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, buffer);
      downloaded.push(filePath);

      if (onProgress) onProgress(i + 1, imageUrls.length);
    } catch (err) {
      console.error(`[download-full] Error fetching image ${i + 1}:`, err.message);
    }
  }

  return downloaded;
}

// Create CBZ from image files on disk
async function createCbzFromDisk(imagePaths, outputPath) {
  const zip = new JSZip();
  for (const imgPath of imagePaths) {
    const data = fs.readFileSync(imgPath);
    const fileName = path.basename(imgPath);
    zip.file(fileName, data);
  }
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, content);
}

// Create master ZIP from CBZ files on disk
async function createMasterZipFromDisk(cbzPaths, outputPath) {
  const zip = new JSZip();
  for (const { name, path: cbzPath } of cbzPaths) {
    const data = fs.readFileSync(cbzPath);
    zip.file(name, data);
  }
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, content);
}

// Main download function
async function downloadFullComic(comicUrl, jobDir, onProgress) {
  const isXoxo = comicUrl.includes('xoxocomic.com');
  const baseUrl = isXoxo ? 'https://xoxocomic.com' : (() => {
    try { return new URL(comicUrl).origin; } catch { return ''; }
  })();

  let browser = null;
  let page = null;

  try {
    // Step 1: Scrape comic info to get chapters
    onProgress('scraping-info', 0, 0);
    browser = await createBrowser();
    page = await setupPage(browser, `${baseUrl}/`);

    // Scrape comic page for chapters
    await page.goto(comicUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    let comicTitle = '';
    let chapters = [];

    if (isXoxo) {
      comicTitle = await page.evaluate(() => {
        const h1 = document.querySelector('.title h1');
        return h1 ? h1.textContent.trim() : '';
      });
      const chapterDivs = await page.evaluate(() => {
        const container = document.getElementById('nt_listchapter');
        if (!container) return [];
        const divs = container.querySelectorAll('.chapter');
        return Array.from(divs).map(div => {
          const a = div.querySelector('a');
          return a ? { title: a.textContent.trim(), url: a.href } : null;
        }).filter(ch => ch && ch.title && ch.url);
      });
      chapters = chapterDivs;
    } else {
      // Generic scraper
      comicTitle = await page.evaluate(() => document.title.replace(/\s*-\s*Read\s*Free.*/i, '').trim());
      const links = await page.evaluate(() => {
        const all = document.querySelectorAll('a[href*="/chapter/"], a[href*="/ch/"], a[href*="/read/"]');
        const seen = new Set();
        return Array.from(all).map(a => {
          const url = a.href;
          const title = a.textContent.trim();
          if (seen.has(url)) return null;
          seen.add(url);
          return { title, url };
        }).filter(Boolean);
      });
      chapters = links;
    }

    if (!comicTitle) comicTitle = 'Comic';
    if (chapters.length === 0) {
      throw new Error('No chapters found');
    }

    console.log(`[download-full] Comic: ${comicTitle}, ${chapters.length} chapters`);

    // Step 2: Download each chapter
    onProgress('downloading-chapters', 0, chapters.length);
    const cbzPaths = [];
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      onProgress('downloading-chapters', i + 1, chapters.length, chapter.title);

      // Extract image URLs using the existing page
      const imageUrls = await extractChapterImageUrls(page, chapter.url, isXoxo);
      if (!imageUrls || imageUrls.length === 0) {
        console.warn(`[download-full] No images for chapter ${chapter.title}`);
        continue;
      }

      console.log(`[download-full] Chapter ${i + 1}: ${imageUrls.length} images`);

      // Download images to disk
      const chapterDir = path.join(jobDir, `chapter_${i}`);
      const downloaded = await downloadImagesToDisk(
        imageUrls,
        chapterDir,
        chapter.url,
        cookieHeader,
        (current, total) => onProgress('downloading-images', current, total, chapter.title)
      );

      if (downloaded.length === 0) {
        console.warn(`[download-full] No images downloaded for chapter ${chapter.title}`);
        continue;
      }

      // Create CBZ
      const cbzName = `${sanitizeFileName(chapter.title || `Chapter${i + 1}`)}.cbz`;
      const cbzPath = path.join(jobDir, cbzName);
      await createCbzFromDisk(downloaded, cbzPath);
      cbzPaths.push({ name: cbzName, path: cbzPath });

      // Cleanup downloaded images (keep CBZ)
      cleanupDir(chapterDir);

      // Small delay between chapters
      if (i < chapters.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (cbzPaths.length === 0) {
      throw new Error('No chapters could be downloaded');
    }

    // Step 3: Bundle into master ZIP
    onProgress('bundling', 0, 0);
    const masterName = `${sanitizeFileName(comicTitle)}Full.zip`;
    const masterPath = path.join(jobDir, masterName);
    await createMasterZipFromDisk(cbzPaths, masterPath);

    // Cleanup CBZs (keep only master)
    for (const { path: cbzPath } of cbzPaths) {
      try { fs.unlinkSync(cbzPath); } catch (e) {}
    }

    console.log(`[download-full] Done: ${masterName}`);
    return { filePath: masterPath, fileName: masterName, comicTitle };
  } finally {
    if (page) {
      try { await page.close(); } catch (e) {}
    }
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

module.exports = {
  TMP_DIR,
  ensureDir,
  sanitizeFileName,
  cleanupDir,
  downloadFullComic,
};
