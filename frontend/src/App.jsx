import React, { useState } from 'react';
import UrlInput from './components/UrlInput';
import ProgressPanel from './components/ProgressPanel';
import ChapterList from './components/ChapterList';
import FullDownloadSection from './components/FullDownloadSection';
import { useScrape } from './hooks/useScrape';

function App() {
  const {
    status,
    comicTitle,
    chapters,
    error,
    progress,
    downloadingChapterIndex,
    scrape,
    downloadChapter,
    downloadFullComic,
  } = useScrape();

  const [url, setUrl] = useState('');

  const handleScrape = async () => {
    if (!url.trim()) return;
    await scrape(url.trim());
  };

  return (
    <div className="app">
      <main className="app-main">
        <div className="content-grid">
          <div className="search-section">
            <div className="search-content">
              <h1 className="search-title">Comic Downloader</h1>
              <UrlInput
                url={url}
                setUrl={setUrl}
                onScrape={handleScrape}
                isLoading={status === 'scraping'}
              />
            </div>
          </div>

          {status === 'scraping' && (
            <ProgressPanel
              progress={progress}
              message="Scraping comic pages..."
            />
          )}

          {error && (
            <div className="info-card">
              <p style={{ color: '#EF4444' }}>{`Error: ${error}`}</p>
            </div>
          )}

          {chapters.length > 0 && comicTitle && (
            <>
              <div className="info-card">
                <h2>{comicTitle}</h2>
                <p>{chapters.length} chapters found</p>
              </div>

              <ChapterList
                chapters={chapters}
                onDownloadChapter={downloadChapter}
                isDownloading={status === 'downloading'}
                downloadingChapterIndex={downloadingChapterIndex}
              />

              <FullDownloadSection
                comicTitle={comicTitle}
                chapters={chapters}
                onDownloadFull={downloadFullComic}
                isDownloading={status === 'downloading'}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
