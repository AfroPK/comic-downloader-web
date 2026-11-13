const { XoxoComicScraper } = require('./xoxocomic');
const { GenericScraper } = require('./generic');

/**
 * Factory function to determine and instantiate the correct scraper based on URL hostname.
 * @param {string} url The URL to scrape.
 * @param {object} [options={}] Options for the scraper (e.g., headless mode).
 * @returns {XoxoComicScraper | GenericScraper} An instantiated scraper object.
 */
function getScraper(url, options = {}) {
    try {
        // Use URL API to safely extract the hostname
        const hostname = new URL(url).hostname;

        if (typeof XoxoComicScraper !== 'undefined' && typeof GenericScraper !== 'undefined') {
            if (hostname.includes('xoxocomic')) {
                console.log(`[Factory] Detected xoxocomic domain. Initializing XoxoComicScraper.`);
                // Assuming constructors accept options object, adjust if they require more/fewer args
                return new XoxoComicScraper(options); 
            } else {
                console.log(`[Factory] Detected generic domain. Initializing GenericScraper.`);
                // Assuming constructors accept options object
                return new GenericScraper(options);
            }
        } else {
             throw new Error("Required scraper classes (XoxoComicScraper or GenericScraper) were not loaded from modules.");
        }

    } catch (e) {
        console.error('Error initializing scraper:', e.message);
        // Re-throw a user-friendly error
        throw new Error(`Could not initialize the appropriate scraper: ${e.message}`);
    }
}

module.exports = { getScraper };