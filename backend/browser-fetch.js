// browser-fetch.js — fetch a URL with puppeteer+stealth (bypasses JS WAFs like
// simply.com's "454 Checking your browser" challenge that plain urllib fails).
// Used by the folklore pipeline as a source-grounding fallback.
//
// Usage: node browser-fetch.js <url> [selector]
// Prints the visible text of the page (or a selector's text) to stdout.
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

const URL = process.argv[2];
const SEL = process.argv[3] || '';
if (!URL) { console.error('usage: node browser-fetch.js <url> [selector]'); process.exit(2); }

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36');
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // give any JS challenge a moment to resolve
    await new Promise(r => setTimeout(r, 5000));
    const text = SEL
      ? await page.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerText : ''; }, SEL)
      : await page.evaluate(() => document.body ? document.body.innerText : '');
    // detect a block page
    if (/454 Checking your browser|455 Security Incident|Checking your browser/.test(text.slice(0, 400))) {
      console.error('WAF_BLOCKED');
      process.exit(3);
    }
    console.log(text);
  } catch (e) {
    console.error('BROWSER_FETCH_ERROR: ' + e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();