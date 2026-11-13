import { useState } from 'react';
import UrlInput from './components/UrlInput';
import ProgressPanel from './components/ProgressPanel';
import ChapterList from './components/ChapterList';
import FullDownloadSection from './components/FullDownloadSection';
import { useScrape } from './hooks/useScrape';

function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="grid-overlay" />
    </div>
  );
}

function Topbar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z" />
            <path d="M4 8h11" />
          </svg>
        </span>
        Comic Downloader
      </div>
      <div className="topbar__meta">
        <span className="dot" /> Ready
      </div>
    </header>
  );
}

function AlertError({ error }) {
  return (
    <div className="alert-error" role="alert">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.5" />
      </svg>
      <div>
        <div className="alert-error__title">Something went wrong</div>
        <div className="alert-error__msg">{error}</div>
      </div>
    </div>
  );
}

function App() {
  const {
    status,
    comicTitle,
    chapters,
    error,
    progress,
    downloadingChapterIndex,
    downloadProgress,
    fullDownloadProgress,
    scrape,
    downloadChapter,
    downloadFullComic,
  } = useScrape();

  const [url, setUrl] = useState('');

  const handleScrape = async () => {
    if (!url.trim()) return;
    await scrape(url.trim());
  };

  const isLoading = status === 'scraping' || status === 'downloading-chapter' || status === 'downloading-full';
  const isDownloadingChapter = status === 'downloading-chapter';
  const isDownloadingFull = status === 'downloading-full';
  const hasResults = chapters.length > 0 && comicTitle;

  return (
    <div className={`app ${isLoading || hasResults ? 'app--active' : ''}`}>
      <Backdrop />
      <Topbar />

      <section className="hero">
        <span className="hero__eyebrow">Scrape · Bundle · Download</span>
        <h1 className="hero__title">
          Any comic, <span className="grad">one click at a time.</span>
        </h1>
        <p className="hero__sub">
          Paste a comic page URL and we&rsquo;ll pull every issue down to a clean
          <b> .cbz </b> — grab a single chapter or the whole series at once.
        </p>
        <UrlInput
          url={url}
          setUrl={setUrl}
          onScrape={handleScrape}
          isLoading={status === 'scraping'}
        />
        {!hasResults && !isLoading && (
          <p className="hero__hint">Paste a comic page or issue URL · press Enter to scan</p>
        )}
      </section>

      <main className="app-main">
        <div className="content-grid">
          {status === 'scraping' && <ProgressPanel progress={progress} />}

          {isDownloadingChapter && (
            <div className="card download-status">
              <div className="download-status__head">
                <span className="download-status__title">
                  <span className="spinner" /> Fetching pages
                </span>
                <span className="download-status__count">
                  {downloadProgress.current}/{downloadProgress.total} images
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${downloadProgress.total ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {error && <AlertError error={error} />}

          {hasResults && (
            <>
              <div className="card info-card comic-header">
                <div>
                  <div className="comic-header__title">{comicTitle}</div>
                  <p>{chapters.length} issues found</p>
                </div>
                <span className="badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5h16v14H4z" /><path d="M4 9h16" />
                  </svg>
                  Ready
                </span>
              </div>

              <FullDownloadSection
                comicTitle={comicTitle}
                chapters={chapters}
                onDownloadFull={downloadFullComic}
                isDownloading={isDownloadingFull}
                fullDownloadProgress={fullDownloadProgress}
              />

              <div className="card info-card">
                <ChapterList
                  chapters={chapters}
                  onDownloadChapter={downloadChapter}
                  isDownloading={isDownloadingChapter}
                  downloadingChapterIndex={downloadingChapterIndex}
                  downloadProgress={downloadProgress}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        Built for comic collectors · Downloads run server-side on your homelab.
      </footer>
    </div>
  );
}

export default App;
