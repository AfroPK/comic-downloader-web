const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

const TMP_DIR = process.env.TMPDIR || (process.platform === 'win32' ? 'C:\\\\Temp' : '/tmp');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function findExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const winPaths = [
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Users\\\\\\' + (process.env.USERNAME || '') + '\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files\\\\BraveSoftware\\\\Brave-Browser\\\\Application\\\\brave.exe',
    'C:\\\\Program Files (x86)\\\\BraveSoftware\\\\Brave-Browser\\\\Application\\\\brave.exe',
  ];
  for (const p of winPaths) {
    if (fs.existsSync(p)) return p;
  }
  const linuxPaths = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

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
    '--disable-gpu',
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
    executablePath: findExecutablePath(),
    cacheDir: process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, '../node_modules/.cache/puppeteer'),
    args: args,
    ignoreDefaultArgs: ['--enable-automation'],
  });
  return browser;
}

async function setupPage(browser, referer) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(USER_AGENT);
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': referer || 'https://example-comic-site.com/',
    'sec-ch-ua': '"Google Chrome";v="125","Chromium";v="125"',
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

// Extract image URLs from a chapter page using an existing browser/page (IMPROVED: Dynamic Waiting)
async function extractChapterImageUrls(page, chapterUrl, isXoxo) {
  if (isXoxo) {
    const allPagesUrl = chapterUrl.endsWith('/all') ? chapterUrl : `${chapterUrl}/all`;
    await page.goto(allPagesUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    try {
        await page.waitForSelector('#comic-page-container', {timeout: 15000});
    } catch (e) {
        console.warn("Could not wait for #comic-page-container, proceeding anyway.");
    }

    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[data-original], img[data-src], img.comic-page');
      return Array.from(imgs)
        .map(img => img.dataset.original || img.dataset.src || img.src)
        .filter(src => src && src.length > 0 && !src.includes('logo') && !src.includes('avatar'));
    });
    return images;
  } else {
    try {
      await page.goto(chapterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch(e) {
      console.log(`[download-full] Goto error for chapter: ${e.message}`);
    }
    
    // Strategy 1: Poll for window.__DATA__
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const chapterData = await page.evaluate(() => window.__DATA__ || null);
        if (chapterData && Array.isArray(chapterData.images) && chapterData.images.length > 0) {
          return chapterData.images;
        }
      } catch (e) {}
    }

    // Strategy 2: Extract image URLs directly from DOM selectors
    try {
      const domImages = await page.evaluate(() => {
        const selectors = ['#comic-page-container img', '.reading-content img', '.chapter-content img', '.view-chapter img', '#chapter-content img', 'img.chapter-img', 'img.page-img'];
        for (const sel of selectors) {
          const imgs = Array.from(document.querySelectorAll(sel));
          if (imgs.length > 0) {
            return imgs.map(i => i.dataset.original || i.dataset.src || i.src).filter(Boolean);
          }
        }
        const allImgs = Array.from(document.querySelectorAll('img'));
        return allImgs
          .map(i => i.dataset.original || i.dataset.src || i.src)
          .filter(src => src && /\.(jpg|jpeg|png|webp|avif)/i.test(src) && !src.includes('logo') && !src.includes('banner'));
      });
      if (domImages && domImages.length > 0) {
        return domImages;
      }
    } catch (e) {
      console.warn(`[download-full] DOM image extraction failed: ${e.message}`);
    }

    throw new Error('Could not extract chapter images after multiple retries.');
  }
}

// Download images via browser context fetch to preserve cookies, TLS, and referer (bypassing 403 Forbidden)
async function downloadImagesToDisk(page, imageUrls, outputDir, referer, onProgress) {
  ensureDir(outputDir);
  const downloaded = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const imgUrl = imageUrls[i];
    try {
      // Execute fetch inside the browser page context so session, cookies, and headers are authentic
      const byteArray = await page.evaluate(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        return Array.from(new Uint8Array(buf));
      }, imgUrl);

      const buffer = Buffer.from(byteArray);
      if (buffer.length < 100) {
        console.error(`[download-full] Image ${i + 1} too small (${buffer.length} bytes)`);
        continue;
      }

      let ext = 'jpg';
      if (imgUrl.includes('.png')) ext = 'png';
      else if (imgUrl.includes('.webp')) ext = 'webp';
      else if (imgUrl.includes('.avif')) ext = 'avif';

      const fileName = `page_${String(i + 1).padStart(3, '0')}.${ext}`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, buffer);
      downloaded.push(filePath);

      if (onProgress) onProgress(i + 1, imageUrls.length);
      console.log(`[download-full] Downloaded image ${i + 1}/${imageUrls.length} (${buffer.length} bytes) via browser context`);
    } catch (err) {
      console.error(`[download-full] Error fetching image ${i + 1} (${imgUrl}):`, err.message);
    }
  }
  return downloaded;
}

// Create CBZ from image files on disk
async function createCbzFromDisk(imagePaths, targetCbzPath) {
  const zip = new JSZip();
  for (const imgPath of imagePaths) {
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      const fileName = path.basename(imgPath);
      zip.file(fileName, data);
    }
  }
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(targetCbzPath, content);
}

// Create master ZIP from CBZ files on disk
async function createMasterZipFromDisk(cbzPaths) {
  const zip = new JSZip();
  for (const { name: cbzName, path: cbzPath } of cbzPaths) {
    if (fs.existsSync(cbzPath)) {
      zip.file(cbzName, fs.readFileSync(cbzPath));
    }
  }
  return zip; 
}

// Main download function
async function downloadFullComic(comicUrl, jobDir, onProgress, comicInfo) {
  const { comicTitle, chapters } = comicInfo;
  if (!chapters || chapters.length === 0) {
    throw new Error('No chapters provided');
  }
  console.log(`[download-full] Comic: ${comicTitle}, ${chapters.length} chapters`);
  const isXoxo = comicUrl.includes('xoxocomic.com');
  const baseUrl = isXoxo ? 'https://xoxocomic.com' : (() => {
    try { return new URL(comicUrl).origin; } catch { return ''; } 
  })();

  let browser = null;
  let page = null;
  let failedChapters = [];
  try {
    browser = await createBrowser();
    page = await setupPage(browser, `${baseUrl}/`);
    onProgress('downloading-chapters', 0, chapters.length);
    const cbzPaths = [];
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      onProgress('downloading-chapters', i + 1, chapters.length, chapter.title);

      try {
        const imageUrls = await extractChapterImageUrls(page, chapter.url, isXoxo);
        if (!imageUrls || imageUrls.length === 0) {
          throw new Error('No image URLs extracted.');
        }
        console.log(`[download-full] Chapter ${i + 1}: ${imageUrls.length} images`);

        const chapterDir = path.join(jobDir, `chapter_${i}`);
        const downloadedImages = await downloadImagesToDisk(
          page,
          imageUrls,
          chapterDir,
          chapter.url,
          (current, total) => onProgress('downloading-images', current, total, chapter.title)
        );

        if (downloadedImages.length === 0) {
            throw new Error('All images failed to download.');
        }

        const sanitizedTitle = sanitizeFileName(chapter.title || '');
        const cbzName = `${sanitizedTitle || ('Chapter_' + (i + 1))}.cbz`;
        const cbzPath = path.join(jobDir, cbzName);
        await createCbzFromDisk(downloadedImages, cbzPath);
        cbzPaths.push({ name: cbzName, path: cbzPath });

      } catch (e) {
        console.error(`[download-full] Failed to process chapter ${i + 1}: ${chapter.title || 'Unknown'}. Reason: ${e.message}`);
        failedChapters.push({ title: chapter.title || `Chapter ${i + 1}`, url: chapter.url, reason: e.message });
      }

      if (i < chapters.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (cbzPaths.length === 0) {
      throw new Error('No chapters could be downloaded successfully');
    }

    onProgress('bundling', 0, 0);
    const sanitizedComicTitle = sanitizeFileName(comicTitle || 'Comic');
    const masterName = `${sanitizedComicTitle || 'Comic'}Full.zip`;

    const masterZip = new JSZip();
    for (const { name: cbzName, path: cbzPath } of cbzPaths) {
      if (fs.existsSync(cbzPath)) {
        masterZip.file(cbzName, fs.readFileSync(cbzPath));
      }
    }

    if (failedChapters.length > 0) {
      console.warn(`[download-full] Found ${failedChapters.length} failed chapters. Creating error report.`);
      let errorReport = `Comic Downloader Report for: ${comicTitle}\n\n`;
      errorReport += `The following chapters failed to download completely or were skipped due to errors:\n`;
      errorReport += `---------------------------------------------------\n`;
      failedChapters.forEach((fail, index) => {
        errorReport += `${index + 1}. Chapter: ${fail.title}\n`;
        errorReport += `   URL: ${fail.url}\n`;
        errorReport += `   Reason: ${fail.reason}\n\n`;
      });
      errorReport += `---------------------------------------------------\n`;
      errorReport += `This report was generated automatically by the downloader script.`;

      masterZip.file('errors.txt', Buffer.from(errorReport));
    }

    const masterPath = path.join(jobDir, masterName);
    const zipBuffer = await masterZip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(masterPath, zipBuffer);

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