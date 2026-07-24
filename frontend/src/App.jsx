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
    downloadProgress,
    scrape,
    downloadChapter,
    downloadFullComic,
  } = useScrape();

  const [url, setUrl] = useState('');

  const handleScrape = async () => {
    if (!url.trim()) return;
    await scrape(url.trim());
  };

  const isLoading = status === 'scraping' || status === 'downloading';
  const hasResults = chapters.length > 0 && comicTitle;

  return (
    <div className={`app ${isLoading || hasResults ? 'app--active' : ''}`}>
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="search-title">Comic Downloader</h1>
          <UrlInput
            url={url}
            setUrl={setUrl}
            onScrape={handleScrape}
            isLoading={status === 'scraping'}
          />
        </div>
      </div>

      <main className="app-main">
        <div className="content-grid">
          {status === 'scraping' && (
            <ProgressPanel progress={progress} />
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
                downloadProgress={downloadProgress}
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
