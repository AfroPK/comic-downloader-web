import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

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

function sanitizeFileName(str) {
  return str.replace(/[^a-zA-Z0-9#]/g, '');
}

async function createCbzBlob(images) {
  const zip = new JSZip();
  for (let i = 0; i < images.length; i++) {
    const imgDataUrl = images[i];
    const blob = dataUrlToBlob(imgDataUrl);
    const ext = blob.type.split('/')[1] || 'jpg';
    zip.file(`page_${String(i + 1).padStart(3, '0')}.${ext}`, blob);
  }
  return zip.generateAsync({ type: 'blob' });
}

async function pollJob(jobId, endpoint, onProgress) {
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}${endpoint}/${jobId}`);
        const data = await res.json();
        if (data.status === 'done') {
          resolve(data.result);
        } else if (data.status === 'error') {
          reject(new Error(data.error));
        } else {
          // Report progress while polling
          if (onProgress && data.progress !== undefined && data.total > 0) {
            onProgress(data.progress, data.total);
          }
          setTimeout(check, 2000);
        }
      } catch (err) {
        reject(err);
      }
    };
    check();
  });
}

function useScrape() {
  const [status, setStatus] = useState('idle');
  const [comicTitle, setComicTitle] = useState('');
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadingChapterIndex, setDownloadingChapterIndex] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [fullDownloadProgress, setFullDownloadProgress] = useState({ chapterIndex: 0, totalChapters: 0, imageCurrent: 0, imageTotal: 0 });

  const scrape = useCallback(async (url) => {
    setStatus('scraping');
    setError('');
    setChapters([]);
    setComicTitle('');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => (prev >= 90 ? 90 : prev + Math.random() * 15));
    }, 500);

    try {
      const response = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scraping failed');
      }

      const { jobId } = await response.json();
      const result = await pollJob(jobId, '/scrape');

      clearInterval(progressInterval);
      setComicTitle(result.comicTitle);
      setChapters(result.chapters);
      setProgress(100);
      setStatus('done');
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
      setStatus('error');
    }
  }, []);

  const downloadChapter = useCallback(async (chapterUrl, chapterTitle, index) => {
    setStatus('downloading-chapter');
    setDownloadingChapterIndex(index);
    setDownloadProgress({ current: 0, total: 0 });
    setError('');

    try {
      const response = await fetch(`${API_BASE}/scrape-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to start chapter download');
      }

      const { jobId } = await response.json();
      // Pass progress callback to pollJob
      const result = await pollJob(jobId, '/scrape-chapter', (current, total) => {
        setDownloadProgress({ current, total });
      });

      if (!result.images || result.images.length === 0) {
        throw new Error('No images received for this chapter');
      }

      const content = await createCbzBlob(result.images);

      // Build filename: Chapter title only, stripping all non-alphanumeric chars (keep #)
      const fileName = `${sanitizeFileName(chapterTitle || `Chapter${index + 1}`)}.cbz`;
      saveAs(content, fileName);

      setStatus('done');
      setDownloadingChapterIndex(null);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setStatus('error');
      setDownloadingChapterIndex(null);
    }
  }, [comicTitle]);

  const downloadFullComic = useCallback(async () => {
    setStatus('downloading-full');
    setError('');
    setFullDownloadProgress({ chapterIndex: 0, totalChapters: chapters.length, imageCurrent: 0, imageTotal: 0 });

    try {
      const zip = new JSZip();
      const comicFolder = zip.folder(sanitizeFileName(comicTitle));

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        setDownloadingChapterIndex(i);
        setFullDownloadProgress({ chapterIndex: i, totalChapters: chapters.length, imageCurrent: 0, imageTotal: 0 });

        const response = await fetch(`${API_BASE}/scrape-chapter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterUrl: chapter.url }),
        });

        if (!response.ok) {
          console.warn(`Skipping chapter ${chapter.title} - request failed`);
          continue;
        }

        const { jobId } = await response.json();
        const data = await pollJob(jobId, '/scrape-chapter', (current, total) => {
          setFullDownloadProgress({ chapterIndex: i, totalChapters: chapters.length, imageCurrent: current, imageTotal: total });
        });

        if (!data.images || data.images.length === 0) {
          console.warn(`Skipping chapter ${chapter.title} - no images`);
          continue;
        }

        const folderName = sanitizeFileName(chapter.title || `Chapter${i + 1}`);
        const folder = comicFolder.folder(folderName);
        for (let j = 0; j < data.images.length; j++) {
          const imgDataUrl = data.images[j];
          const blob = dataUrlToBlob(imgDataUrl);
          const ext = blob.type.split('/')[1] || 'jpg';
          folder.file(`page_${String(j + 1).padStart(3, '0')}.${ext}`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `${sanitizeFileName(comicTitle)}.cbz`;
      saveAs(content, fileName);

      setStatus('done');
      setDownloadingChapterIndex(null);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setStatus('error');
      setDownloadingChapterIndex(null);
    }
  }, [chapters, comicTitle]);

  return {
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
  };
}

export { useScrape };
