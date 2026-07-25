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
    const img = images[i];
    const ext = img.mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = `${String(i + 1).padStart(3, '0')}.${ext}`;
    const blob = dataUrlToBlob(img.dataUrl);
    zip.file(filename, blob);
  }
  return zip.generateAsync({ type: 'blob' });
}

function waitForJob(jobId, onProgress, endpoint = 'scrape') {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/${endpoint}/${jobId}`);
        const data = await res.json();
        if (onProgress) onProgress(data);
        if (data.status === 'done') {
          clearInterval(interval);
          resolve(data.result);
        } else if (data.status === 'error') {
          clearInterval(interval);
          reject(new Error(data.error));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, 500);
  });
}

export function useScrape() {
  const [status, setStatus] = useState('idle');
  const [comicTitle, setComicTitle] = useState('');
  const [comicUrl, setComicUrl] = useState('');
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadingChapterIndex, setDownloadingChapterIndex] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [fullDownloadProgress, setFullDownloadProgress] = useState({ current: 0, total: 0 });

  const scrape = useCallback(async (url) => {
    setStatus('scraping');
    setError('');
    setComicTitle('');
    setComicUrl(url);
    setChapters([]);
    setProgress(0);

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
      const result = await waitForJob(jobId, (data) => {
        if (data.progress !== undefined && data.total !== undefined) {
          setProgress(data.total ? Math.round((data.progress / data.total) * 100) : 0);
        }
      }, 'scrape');

      setComicTitle(result.title || 'Untitled Comic');
      setChapters(result.chapters || []);
      setStatus('idle');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  const downloadChapter = useCallback(async (chapter, index) => {
    setStatus('downloading-chapter');
    setDownloadingChapterIndex(index);
    setDownloadProgress(0);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/scrape-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterUrl: chapter.url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start chapter download');
      }

      const { jobId } = await response.json();
      const result = await waitForJob(jobId, (data) => {
        if (data.progress !== undefined && data.total !== undefined) {
          setDownloadProgress(data.total ? Math.round((data.progress / data.total) * 100) : 0);
        }
      }, 'scrape-chapter');

      if (!result.images || result.images.length === 0) {
        throw new Error('No images received for this chapter');
      }

      const cbzBlob = await createCbzBlob(result.images);
      const safeTitle = sanitizeFileName(comicTitle || 'comic');
      const safeChapter = sanitizeFileName(chapter.title || `chapter-${index + 1}`);
      saveAs(cbzBlob, `${safeTitle}_${safeChapter}.cbz`);
      setStatus('idle');
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setStatus('error');
    } finally {
      setDownloadingChapterIndex(null);
    }
  }, [comicTitle]);

  const downloadFullComic = useCallback(async () => {
    if (!comicUrl) {
      setError('No comic URL available. Please scrape the comic first.');
      return;
    }

    setStatus('downloading-full');
    setFullDownloadProgress({ current: 0, total: chapters.length });
    setError('');

    try {
      const response = await fetch(`${API_BASE}/download-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicUrl }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to start full download');
      }

      const { jobId } = await response.json();

      const result = await new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`${API_BASE}/download-full/${jobId}`);
            const data = await res.json();
            setFullDownloadProgress({ current: data.progress || 0, total: data.total || chapters.length });

            if (data.status === 'done') {
              clearInterval(interval);
              resolve(data);
            } else if (data.status === 'error') {
              clearInterval(interval);
              reject(new Error(data.error || 'Download failed'));
            }
          } catch (err) {
            clearInterval(interval);
            reject(err);
          }
        }, 1000);
      });

      if (result.filePath) {
        window.location.href = `${API_BASE}/download-full/${jobId}/file`;
      }

      setStatus('idle');
    } catch (err) {
      setError(`Full download failed: ${err.message}`);
      setStatus('error');
    }
  }, [comicUrl, chapters.length]);

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
