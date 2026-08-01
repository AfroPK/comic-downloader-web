const { scrapeComic } = require('./src/scrape');
const { scrapeChapter } = require('./src/scrape-chapter');

async function testScrapeDetailed() {
  const comicUrl = process.argv[2] || 'https://example-comic-site.com/11742-absolute-batman-2024';

  console.log('Testing detailed scrape for:', comicUrl);

  try {
    const comicResult = await scrapeComic(comicUrl);
    console.log('Comic Title:', comicResult.comicTitle);
    console.log('Chapters found:', comicResult.chapters.length);

    if (comicResult.chapters.length > 0) {
      const firstChapter = comicResult.chapters[0];
      console.log('Testing chapter scrape:', firstChapter.url);
      const chapterResult = await scrapeChapter(firstChapter.url);
      console.log('Images found:', chapterResult.images.length);
    }
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

testScrapeDetailed();
