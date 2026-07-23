# PHASE 05: Create React Source Files

## Goal
Create all React components, hooks, and CSS for the frontend.

## Step 1: Create main.jsx

Write this EXACT code to `comic-downloader-web/frontend/src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

## Step 2: Create index.css

Write this EXACT code to `comic-downloader-web/frontend/src/index.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100vh;
}

#root {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.app {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  text-align: center;
  color: #00d4ff;
  font-size: 2rem;
}

.input-section {
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.input-section input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #0f3460;
  border-radius: 8px;
  background: #0f3460;
  color: #e0e0e0;
  font-size: 1rem;
  outline: none;
}

.input-section input:focus {
  border-color: #00d4ff;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.btn:active {
  transform: scale(0.97);
}

.btn-primary {
  background: #00d4ff;
  color: #0a0a23;
}

.btn-primary:hover {
  background: #00b8e6;
}

.btn-success {
  background: #00c853;
  color: #0a0a23;
}

.btn-success:hover {
  background: #00a844;
}

.btn-warning {
  background: #ff9800;
  color: #0a0a23;
}

.btn-warning:hover {
  background: #e68900;
}

.info-card {
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem;
}

.info-card h2 {
  color: #00d4ff;
  margin-bottom: 0.5rem;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.chapter-item {
  background: #0f3460;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapter-item .chapter-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chapter-item .chapter-title {
  font-weight: 600;
  color: #fff;
}

.chapter-item .chapter-meta {
  font-size: 0.85rem;
  color: #888;
}

.chapter-item .chapter-actions {
  display: flex;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #0f3460;
  border-radius: 3px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.progress-bar .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #00c853);
  transition: width 0.3s ease;
}

.status-message {
  text-align: center;
  padding: 1rem;
  color: #aaa;
  font-style: italic;
}

.status-message.error {
  color: #ff5252;
}

.status-message.success {
  color: #00c853;
}

.full-download-section {
  text-align: center;
  margin-top: 1rem;
}

@media (max-width: 600px) {
  .input-section {
    flex-direction: column;
  }

  .chapter-item {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
}
```

## Step 3: Create App.jsx

Write this EXACT code to `comic-downloader-web/frontend/src/App.jsx`:

```jsx
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
      <h1>Comic Downloader</h1>

      <UrlInput
        url={url}
        setUrl={setUrl}
        onScrape={handleScrape}
        isLoading={status === 'scraping'}
      />

      {status === 'scraping' && (
        <ProgressPanel
          progress={progress}
          message="Scraping comic pages..."
        />
      )}

      {error && (
        <div className="info-card">
          <p>{`Error: ${error}`}</p>
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
  );
}

export default App;
```

## Step 4: Create UrlInput.jsx component

Create file `comic-downloader-web/frontend/src/components/UrlInput.jsx`:

```jsx
function UrlInput({ url, setUrl, onScrape, isLoading }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onScrape();
    }
  };

  return (
    <div className="input-section">
      <input
        type="url"
        placeholder="Enter comic site comic URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <button
        className="btn btn-primary"
        onClick={onScrape}
        disabled={isLoading || !url.trim()}
      >
        {isLoading ? 'Loading...' : 'Download'}
      </button>
    </div>
  );
}

export default UrlInput;
```

## Step 5: Create ProgressPanel.jsx component

Create file `comic-downloader-web/frontend/src/components/ProgressPanel.jsx`:

```jsx
function ProgressPanel({ progress, message }) {
  return (
    <div className="info-card">
      <p>{message}</p>
      <div className="progress-bar">
        <div style={{ width: `${progress}%` }} className="progress-fill" />
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#888' }}>
        {progress}%
      </p>
    </div>
  );
}

export default ProgressPanel;
```

## Step 6: Create ChapterList.jsx component

Create file `comic-downloader-web/frontend/src/components/ChapterList.jsx`:

```jsx
function ChapterList({ chapters, onDownloadChapter, isDownloading }) {
  return (
    <div className="info-card">
      <h2>Chapters</h2>
      <div className="chapter-list">
        {chapters.map((chapter, index) => (
          <div className="chapter-item" key={index}>
            <div className="chapter-info">
              <span>{chapter.title || `Chapter ${index + 1}`}</span>
              <span>{chapter.images.length} images</span>
              {chapter.error && (
                <span style={{ color: '#ff5252' }}> — {chapter.error}</span>
              )}
            </div>
            <button
              className="btn btn-success"
              onClick={() => onDownloadChapter(index)}
              disabled={isDownloading || chapter.images.length === 0}
            >
              CBZ
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChapterList;
```

## Step 7: Create FullDownloadSection.jsx component

Create file `comic-downloader-web/frontend/src/components/FullDownloadSection.jsx`:

```jsx
function FullDownloadSection({ comicTitle, chapters, onDownloadFull, isDownloading }) {
  const totalImages = chapters.reduce((sum, c) => sum + c.images.length, 0);

  return (
    <div className="info-card full-download-section">
      <h2>Full Comic</h2>
      <p>{chapters.length} chapters, {totalImages} total images</p>
      <button
        className="btn btn-warning"
        onClick={onDownloadFull}
        disabled={isDownloading || totalImages === 0}
        style={{ marginTop: '0.75rem' }}
      >
        Download Full Comic as CBZ
      </button>
    </div>
  );
}

export default FullDownloadSection;
```

## Step 8: Create useScrape.js hook

Create file `comic-downloader-web/frontend/src/hooks/useScrape.js`:

```jsx
import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_BASE = '/api';

function useScrape() {
  const [status, setStatus] = useState('idle');
  const [comicTitle, setComicTitle] = useState('');
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const scrape = useCallback(async (url) => {
    setStatus('scraping');
    setError('');
    setChapters([]);
    setComicTitle('');
    setProgress(0);

    try {
      const response = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.status === 'done') {
        setComicTitle(data.comicTitle);
        setChapters(data.chapters);
        setStatus('done');
        setProgress(100);
      } else if (data.status === 'error') {
        setError(data.error);
        setStatus('error');
      }
    } catch (err) {
      setError(`Failed to connect: ${err.message}`);
      setStatus('error');
    }
  }, []);

  const downloadChapter = useCallback(async (chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (!chapter || chapter.images.length === 0) return;

    setStatus('downloading');
    setProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder(chapter.title.replace(/[^a-zA-Z0-9_-]/g, '_'));

      for (let i = 0; i < chapter.images.length; i++) {
        const img = chapter.images[i];
        setProgress(Math.round(((i + 1) / chapter.images.length) * 100));

        const encodedUrl = Buffer.from(img).toString('base64');
        const response = await fetch(`${API_BASE}/image?url=${encodedUrl}`);

        if (!response.ok) {
          console.warn(`Failed to fetch image: ${img}`);
          continue;
        }

        const blob = await response.blob();
        const num = String(i + 1).padStart(4, '0');
        const ext = blob.type.split('/')[1] || 'jpg';
        folder.file(`${num}.${ext}`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `${comicTitle}_${chapter.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.cbz`;
      saveAs(content, fileName);

      setStatus('done');
      setProgress(100);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setStatus('error');
    }
  }, [chapters, comicTitle]);

  const downloadFullComic = useCallback(async () => {
    if (chapters.length === 0) return;

    setStatus('downloading');
    setProgress(0);

    try {
      const zip = new JSZip();

      let totalImages = 0;
      chapters.forEach(c => { totalImages += c.images.length; });

      let processedImages = 0;

      for (let ci = 0; ci < chapters.length; ci++) {
        const chapter = chapters[ci];
        if (chapter.images.length === 0) continue;

        const folder = zip.folder(chapter.title.replace(/[^a-zA-Z0-9_-]/g, '_'));

        for (let i = 0; i < chapter.images.length; i++) {
          const img = chapter.images[i];
          processedImages++;
          setProgress(Math.round((processedImages / totalImages) * 100));

          const encodedUrl = Buffer.from(img).toString('base64');
          const response = await fetch(`${API_BASE}/image?url=${encodedUrl}`);

          if (!response.ok) {
            console.warn(`Failed to fetch image: ${img}`);
            continue;
          }

          const blob = await response.blob();
          const num = String(i + 1).padStart(4, '0');
          const ext = blob.type.split('/')[1] || 'jpg';
          folder.file(`${num}.${ext}`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `${comicTitle}.cbz`;
      saveAs(content, fileName);

      setStatus('done');
      setProgress(100);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setStatus('error');
    }
  }, [chapters, comicTitle]);

  return {
    status,
    comicTitle,
    chapters,
    error,
    progress,
    scrape,
    downloadChapter,
    downloadFullComic,
  };
}

export { useScrape };
```

## Step 9: Verify all React files were created

Run this command to list all created files:

```bash
find comic-downloader-web/frontend -name "*.jsx" -o -name "*.css" -o -name "*.html" | head -20
```

You should see all the source files.

---

**Next phase:** Run `npm install` in both backend and frontend, then start the app!
