const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

async function testScrape() {
  const url = 'https://batcave.biz/11742-absolute-batman-2024';
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );

  console.log('Loading page:', url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

  // Save screenshot for debugging
  await page.screenshot({ path: 'debug-page.png', fullPage: false });
  console.log('Screenshot saved to debug-page.png');

  // Get page HTML structure
  const pageInfo = await page.evaluate(() => {
    // Check for comic detail page elements
    const h1 = document.querySelector('h1');
    const postTitle = document.querySelector('.post-title');
    const comicTitle = document.querySelector('.comic-title');
    const pageTitle = document.querySelector('title');
    
    // Check for all buttons with "read"
    const readButtons = Array.from(document.querySelectorAll('a, button')).filter(el => 
      el.textContent.toLowerCase().includes('read') || 
      el.href?.includes('/reader/')
    ).map(el => ({
      tag: el.tagName,
      class: el.className,
      href: el.href,
      text: el.textContent.trim().substring(0, 100)
    }));
    
    // Get main content classes
    const mainContent = document.querySelector('main, .content, .main, article');
    
    return {
      h1: h1?.textContent,
      postTitle: postTitle?.textContent,
      comicTitle: comicTitle?.textContent,
      pageTitle: pageTitle?.textContent,
      readButtons,
      mainContentClass: mainContent?.className,
      bodyClasses: document.body.className
    };
  });
  
  console.log('Page structure:', JSON.stringify(pageInfo, null, 2));

  await browser.close();
}

testScrape().catch(console.error);
