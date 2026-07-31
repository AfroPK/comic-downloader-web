// backend/src/scrapers/base-scraper.js

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { config } = require('dotenv');

// Load environment variables from .env file (assuming it's in the project root)
config(); 

// Extend puppeteer with stealth plugin
puppeteer.use(StealthPlugin());

/**
 * BaseScraper class handles common Puppeteer setup, teardown, and utility logic
 * for web scraping operations across different scrapers.
 */
class BaseScraper {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Initializes the browser instance using puppeteer-extra and stealth plugin.
     */
    async initBrowser() {
        console.log("Initializing headless browser...");
        try {
            // Using 'chromium' and ensuring args are configured for stability
            this.browser = await puppeteer.launch({
                headless: process.env.HEADLESS !== 'false', // Use visible mode if HEADLESS is explicitly set to false in .env
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage'
                ]
            });
            this.page = await this.browser.newPage();
            console.log("Browser initialized successfully.");
        } catch (error) {
            console.error("Error initializing browser:", error);
            throw new Error('Failed to initialize Puppeteer browser.');
        }
    }

    /**
     * Closes the browser instance gracefully. This should be called upon completion or failure.
     */
    async closeBrowser() {
        if (this.browser) {
            console.log("Closing browser...");
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log("Browser closed.");
        }
    }

    /**
     * Utility function to safely navigate to a URL with built-in retry logic.
     * @param {string} url The URL to navigate to.
     * @param {number} [maxRetries=3] Maximum number of retries.
     */
    async safeNavigate(url, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`Attempting to navigate to ${url} (Attempt ${attempt + 1}/${maxRetries})...`);
                await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                return true; // Success on navigation
            } catch (error) {
                console.warn(`Navigation failed for ${url} on attempt ${attempt + 1}. Error: ${error.message}`);
                if (attempt < maxRetries - 1) {
                    // Simple exponential backoff delay
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                } else {
                    console.error(`All ${maxRetries} attempts failed for ${url}.`);
                    throw error; // Re-throw the final error
                }
            }
        }
    }

    /**
     * Executes a function with built-in retry logic. Useful for flaky selectors or network calls.
     * @param {Function} asyncFn The asynchronous function to execute (must be bound to 'this').
     * @param {number} [maxRetries=3] Maximum number of retries.
     */
    async retry(asyncFn, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`Executing task with retry logic (Attempt ${attempt + 1}/${maxRetries})...`);
                // Execute the function in the context of the class instance
                const result = await asyncFn.call(this);
                return result; // Success, return the result
            } catch (error) {
                console.warn(`Task failed on attempt ${attempt + 1}. Error: ${error.message}`);
                if (attempt < maxRetries - 1) {
                    // Simple exponential backoff delay
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                } else {
                    console.error(`All ${maxRetries} attempts failed for the task.`);
                    throw error; // Re-throw the final error
                }
            }
        }
    }

    /**
     * A placeholder for safe, robust element interaction (e.g., click).
     * This method should ideally wrap selectors with retry and wait logic.
     * @param {string} selector The CSS selector for the target element.
     */
    async safeClick(selector) {
        const action = async () => {
            await this.page.waitForSelector(selector, { timeout: 15000 });
            await this.page.click(selector);
            console.log(`Successfully clicked element with selector: ${selector}`);
            return true;
        };
        // Use the general retry mechanism for robust interaction
        return await this.retry(action, 4); // Increased retries for clicks
    }
}

module.exports = BaseScraper;