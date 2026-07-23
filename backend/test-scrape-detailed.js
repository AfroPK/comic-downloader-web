const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

async function testScrape() {
  const url = 'https://batcave.biz/11742-absolute-batman-2024';
  
  const browser = await puppeteer.launch({
    headless: false, // Run with visible browser to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );

  console.log('Loading page:', url);
  
  // Track redirects
  page.on('response', response => {
    if (response.status() >= 300 && response.status() < 400) {
      console.log(`Redirect: ${response.status()} from ${response.url()} to ${response.headers()['location']}`);
    }
  });

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  
  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);

  // Wait a bit for any dynamic content
  await page.waitForTimeout(3000);

  // Check what's actually on the page
  const content = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      bodyText: document.body.textContent.substring(0, 500),
      h1Count: document.querySelectorAll('h1').length,
      h1Text: document.querySelector('h1')?.textContent
    };
  });

  console.log('Page content:', JSON.stringify(content, null, 2));

  console.log('\nBrowser will stay open for 10 seconds so you can inspect...');
  await page.waitForTimeout(10000);

  await browser.close();
}

testScrape().catch(console.error);
