// backend/src/scrapers/xoxocomic.js
const BaseScraper = require('./base-scraper');

/**
 * XoxoComicScraper extends BaseScraper to handle comic scraping logic,
 * leveraging robust browser lifecycle management provided by the base class.
 */
class XoxoComicScraper extends BaseScraper {
    constructor() {
        super();
        this.BASE_URL = 'https://xoxocomic.com';
        this.USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    }

    /**
     * Initializes the browser and page using the base class methods.
     * Must be called before any scraping methods.
     */
    async setup() {
        await super.initBrowser(); // Calls BaseScraper's initBrowser
        // Set up common page parameters after base initialization
        console.log('Setting up comic-specific page configurations...');
        await this.page.setViewport({ width: 1920, height: 1080 });
        await this.page.setUserAgent(this.USER_AGENT);
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Referer': `${this.BASE_URL}/`,
            'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
        });
    }

    /**
     * Scrapes comic chapter listings from the main site.
     * @returns {object} Contains comicTitle and an array of chapters (with url/title).
     */
    async scrapeComic() {
        let result = null;
        try {
            await this.setup(); // Initialize browser and page

            console.log('[xoxocomic] Visiting homepage to establish session...');
            
            // Use safeNavigate for robust navigation
            await this.safeNavigate(`${this.BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

            await new Promise(r => setTimeout(r, 2000));

            const comicTitle = await this.page.evaluate(() => {
                const titleEl = document.querySelector('h1');
                return titleEl ? titleEl.textContent.trim() : 'Unknown Comic';
            });
            console.log(`[xoxocomic] Comic title: ${comicTitle}`);

            const chapters = await this.page.evaluate(() => {
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
            result = { comicTitle, chapters };
        } catch (err) {
            console.error('[xoxocomic] Error during scrapeComic:', err);
            throw err;
        } finally {
            await this.closeBrowser(); // Ensure cleanup happens regardless of outcome
        }
        return result;
    }

    /**
     * Scrapes individual chapter images from a given URL.
     * @param {string} chapterUrl The full URL for the chapter/pages view.
     * @param {function} [onProgress] Callback function (current, total).
     * @returns {Promise<{images: string[]}>} Array of base64 encoded image data URIs.
     */
    async scrapeChapter(chapterUrl, onProgress = null) {
        let result = null;
        try {
            await this.setup(); // Initialize browser and page

            const allPagesUrl = chapterUrl.endsWith('/all') ? chapterUrl : `${chapterUrl}/all`;
            console.log(`[xoxocomic] Loading chapter (all pages): ${allPagesUrl}`);

            // Use safeNavigate for robust navigation to the target URL
            await this.safeNavigate(allPagesUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 3000));

            const images = await this.page.evaluate(() => {
                const imgs = document.querySelectorAll('img[data-original]');
                return Array.from(imgs).map(img => img.dataset.original).filter(src => src && src.length > 0);
            });

            console.log(`[xoxocomic] Found ${images.length} images on all-pages view`);
            if (images.length === 0) {
                throw new Error('No images found for this chapter');
            }

            const base64Images = [];
            const cookies = await this.page.cookies();
            const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

            for (let i = 0; i < images.length; i++) {
                const imgUrl = images[i];
                try {
                    // Use fetch API, which is available in the Node context for network requests outside of puppeteer's page methods
                    const response = await fetch(imgUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                            'Referer': chapterUrl,
                            'Cookie': cookieHeader,
                            'User-Agent': this.USER_AGENT,
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
            result = { images: base64Images };
        } catch (err) {
            console.error('[xoxocomic] Error during scrapeChapter:', err);
            throw err;
        } finally {
            await this.closeBrowser(); // Ensure cleanup happens regardless of outcome
        }
        return result;
    }
}

// Export the class for external usage, matching the module structure expectation
module.exports = XoxoComicScraper;