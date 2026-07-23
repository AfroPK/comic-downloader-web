# PHASE 02: Create Backend Scraper Module

## Goal
Create the Puppeteer scraper that bypasses Cloudflare and extracts comic/chapter data.

## Step 1: Create scrape.js with exact content

Write this EXACT code to `comic-downloader-web/backend/src/scrape.js`:

```javascript
const puppeteer = require('puppeteer');

/**
 * Scrape a comic site comic page.
 */
async function scrapeComic(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  // Block non-essential resources for speed
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Navigate and wait for Cloudflare challenge to resolve
  console.log(`[scrape] Navigating to ${url}`);
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Wait for lazy-loaded content
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Extract comic title
  const comicTitle = await page.evaluate(() => {
    const titleEl = document.querySelector('h1, .title, .comic-title, [class*="title"]');
    return titleEl ? titleEl.textContent.trim() : 'Unknown Comic';
  });

  console.log(`[scrape] Comic title: ${comicTitle}`);

  // Extract chapter links from listing page
  const chapters = await page.evaluate((baseUrl) => {
    const chapterLinks = [];
    const anchors = document.querySelectorAll('a[href]');

    anchors.forEach((a) => {
      const href = a.href;
      const text = a.textContent.trim();
      if (href.includes('.html') && !href.includes('page=') && !href.includes('search') && !href.includes('login')) {
        chapterLinks.push({ title: text || `Chapter ${chapterLinks.length + 1}`, url: href });
      }
    });

    // Look for pagination/navigation links if no chapters found
    if (chapterLinks.length === 0) {
      const navItems = document.querySelectorAll('.pagination a, .nav-links a, [class*="page"] a');
      navItems.forEach((a) => {
        const href = a.href;
        if (href.includes('.html') && !chapterLinks.find(c => c.url === href)) {
          chapterLinks.push({ title: a.textContent.trim() || 'Chapter', url: href });
        }
      });
    }

    // Deduplicate by URL
    const seen = new Set();
    return chapterLinks.filter(c => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });
  }, url);

  console.log(`[scrape] Found ${chapters.length} chapters`);

  // Scrape each chapter for images
  const chaptersWithImages = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    console.log(`[scrape] Scraping chapter ${i + 1}/${chapters.length}: ${chapter.title}`);

    try {
      const images = await scrapeChapterImages(page, chapter.url);
      chaptersWithImages.push({
        title: chapter.title,
        url: chapter.url,
        images: images,
      });
    } catch (err) {
      console.error(`[scrape] Error scraping chapter "${chapter.title}":`, err.message);
      chaptersWithImages.push({
        title: chapter.title,
        url: chapter.url,
        images: [],
        error: err.message,
      });
    }
  }

  await browser.close();

  return {
    comicTitle,
    chapters: chaptersWithImages,
  };
}

/**
 * Extract image URLs from a chapter page.
 */
async function scrapeChapterImages(page, chapterUrl) {
  await page.goto(chapterUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // Wait for images to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  const images = await page.evaluate(() => {
    const imgElements = document.querySelectorAll('img');
    const urls = [];

    imgElements.forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src');
      if (src && (src.startsWith('http') || src.startsWith('//'))) {
        // Filter out tiny images
        const naturalWidth = img.naturalWidth || 0;
        const naturalHeight = img.naturalHeight || 0;
        if (naturalWidth > 200 || naturalHeight > 200 || !img.naturalWidth) {
          urls.push(src.startsWith('//') ? `https:${src}` : src);
        }
      }
    });

    // Deduplicate
    return [...new Set(urls)];
  });

  return images;
}

module.exports = { scrapeComic };
```

## Step 2: Verify scraper.js was created correctly

Run this command to check the file exists and has content:

```bash
head -20 comic-downloader-web/backend/src/scrape.js
```

You should see the first 20 lines of the scrape.js file.

---

**Note:** This scraper uses Puppeteer to handle Cloudflare challenges automatically. When it runs, you'll see browser activity in the console output.
