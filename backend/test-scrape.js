const { scrapeComic } = require('./src/scrape');

async function testScrape() {
  const url = process.argv[2] || 'https://example-comic-site.com/11742-absolute-batman-2024';

  console.log('Testing scrape for:', url);

  try {
    const result = await scrapeComic(url);
    console.log('Comic Title:', result.comicTitle);
    console.log('Chapters found:', result.chapters.length);
    if (result.chapters.length > 0) {
      console.log('First chapter:', result.chapters[0]);
    }
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

testScrape();
