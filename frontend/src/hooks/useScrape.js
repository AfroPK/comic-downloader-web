import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Convert a data URL (data:image/jpeg;base64,...) to a Blob.
 */
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function useScrape() {
  const [status, setStatus] = useState('idle');
  const [comicTitle, setComicTitle] = useState('');
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadingChapterIndex, setDownloadingChapterIndex] = useState(null);

  const scrape = useCallback(async (url) => {
    setStatus('scraping');
    setError('');
    setChapters([]);
    setComicTitle('');
    setProgress(0);

    // Simulate progress while waiting for backend
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90; // Cap at 90% until complete
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      clearInterval(progressInterval);

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
      clearInterval(progressInterval);
      setError(`Failed to connect: ${err.message}`);
      setStatus('error');
    }
  }, []);

  const downloadChapter = useCallback(async (chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (!chapter) return;

    setStatus('downloading');
    setDownloadingChapterIndex(chapterIndex);
    setProgress(0);

    try {
      // Fetch chapter images from the backend
      const response = await fetch(`${API_BASE}/scrape-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterUrl: chapter.url }),
      });

      const data = await response.json();

      if (data.status !== 'done' || !data.images || data.images.length === 0) {
        throw new Error('No images received for this chapter');
      }

      const zip = new JSZip();
      const folderName = chapter.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const folder = zip.folder(folderName);

      for (let i = 0; i < data.images.length; i++) {
        const imgDataUrl = data.images[i];
        setProgress(Math.round(((i + 1) / data.images.length) * 100));

        const blob = dataUrlToBlob(imgDataUrl);
        const ext = blob.type.split('/')[1] || 'jpg';
        const num = String(i + 1).padStart(4, '0');
        folder.file(`${num}.${ext}`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `${comicTitle}_${folderName}.cbz`;
      saveAs(content, fileName);

      setStatus('done');
      setProgress(100);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setStatus('error');
    } finally {
      setDownloadingChapterIndex(null);
    }
  }, [chapters, comicTitle]);

  const downloadFullComic = useCallback(async () => {
    if (chapters.length === 0) return;

    setStatus('downloading');
    setDownloadingChapterIndex(null);
    setProgress(0);

    try {
      const zip = new JSZip();
      let processedChapters = 0;

      for (let ci = 0; ci < chapters.length; ci++) {
        const chapter = chapters[ci];
        
        // Fetch chapter images from the backend
        const response = await fetch(`${API_BASE}/scrape-chapter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterUrl: chapter.url }),
        });

        const data = await response.json();

        if (data.status !== 'done' || !data.images || data.images.length === 0) {
          console.warn(`Skipping chapter ${chapter.title} - no images`);
          continue;
        }

        const folderName = chapter.title.replace(/[^a-zA-Z0-9_-]/g, '_');
        const folder = zip.folder(folderName);

        for (let i = 0; i < data.images.length; i++) {
          const imgDataUrl = data.images[i];
          const blob = dataUrlToBlob(imgDataUrl);
          const ext = blob.type.split('/')[1] || 'jpg';
          const num = String(i + 1).padStart(4, '0');
          folder.file(`${num}.${ext}`, blob);
        }

        processedChapters++;
        setProgress(Math.round((processedChapters / chapters.length) * 100));
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
    downloadingChapterIndex,
    scrape,
    downloadChapter,
    downloadFullComic,
  };
}

export { useScrape };
