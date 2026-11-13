import { useState, useCallback } from 'react';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Poll fetches must never hit the HTTP cache: the server returns JSON with an
// ETag, and a cached "pending" body would make the poller miss the real
// "done" transition.
const NO_STORE = { cache: 'no-store' };

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

// Re-encode a page to JPEG. Pages from these sites are often served as WebP,
// which many CBZ readers can't display — the archive then looks "empty". JPEG
// opens everywhere. Falls back to the original bytes if conversion fails.
async function toJpegBlob(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0);
    if (bmp.close) bmp.close();
    const out = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
    return out || blob;
  } catch (e) {
    return blob;
  }
}

function extForBlob(blob) {
  const t = (blob.type || '').split('/')[1] || 'jpg';
  return t === 'jpeg' ? 'jpg' : t;
}

async function createCbzBlob(images) {
  const zip = new JSZip();
  for (let i = 0; i < images.length; i++) {
    const blob = await toJpegBlob(dataUrlToBlob(images[i]));
    zip.file(`page_${String(i + 1).padStart(3, '0')}.${extForBlob(blob)}`, blob);
  }
  return zip.generateAsync({ type: 'blob' });
}

// Single-poller status poller.
//
// Previously this opened an EventSource at a non-existent SSE endpoint AND ran
// a redundant "initial check" fetch in addition to the interval poll — three
// concurrent readers of a delete-after-fetch job. When the large result body was
// still streaming, a concurrent poll hit the already-deleted job (404, no
// `status` field) and rejected the whole download before it could resolve.
// One in-flight-guarded poller removes that race.
function pollJob(jobId, endpoint, onProgressCallback, intervalMs = 2000) {
  return new Promise((resolve, reject) => {
    let inFlight = false;
    let settled = false;
    let timer;

    const stop = () => {
      settled = true;
      if (timer) clearInterval(timer);
    };

    const tick = async () => {
      if (inFlight || settled) return; // don't overlap requests
      inFlight = true;
      try {
        const res = await fetch(`${API_BASE}${endpoint}/${jobId}`, NO_STORE);
        const data = await res.json();
        if (settled) return;

        if (data.status === 'done') {
          stop();
          resolve(data.result || data);
        } else if (data.status === 'error') {
          stop();
          reject(new Error(data.error || 'Job failed'));
        } else if (!data.status) {
          // Job is gone before we captured a result (expired/cleaned up).
          stop();
          reject(new Error('Job no longer available. Please try again.'));
        } else if (onProgressCallback && data.total > 0) {
          onProgressCallback(data.progress, data.total);
        }
      } catch (err) {
        if (!settled) {
          stop();
          reject(err);
        }
      } finally {
        inFlight = false;
      }
    };

    // Kick off immediately, then on interval.
    tick();
    timer = setInterval(tick, intervalMs);
  });
}

function useScrape() {
  const [status, setStatus] = useState('idle');
  const [comicTitle, setComicTitle] = useState('');
  const [chapters, setChapters] = useState([]);
  const [comicUrl, setComicUrl] = useState('');
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
    setComicUrl(url);
    setProgress(0);

    let progressInterval;

    try {
      progressInterval = setInterval(() => {
        setProgress(prev => (Math.min(95, prev + Math.random() * 15)));
      }, 500);

      const response = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        ...NO_STORE,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Scraping failed');
      }

      const { jobId } = await response.json();

      const result = await pollJob(jobId, '/scrape', (current) => {
        setProgress(Math.max(10, current));
      }, 1500);

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
        ...NO_STORE,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start chapter download');
      }

      const { jobId } = await response.json();

      const result = await pollJob(jobId, '/scrape-chapter', (current, total) => {
        setDownloadProgress({ current, total });
      });

      if (!result.images || result.images.length === 0) {
        throw new Error('No images received for this chapter');
      }

      const content = await createCbzBlob(result.images);
      const fileName = `${sanitizeFileName(chapterTitle || ('Chapter ' + (index + 1)))}.cbz`;
      saveAs(content, fileName);

      setStatus('done');
      setDownloadingChapterIndex(null);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setStatus('error');
      setDownloadingChapterIndex(null);
    }
  }, []);

  const downloadFullComic = useCallback(async () => {
    setStatus('downloading-full');
    setError('');
    setFullDownloadProgress({ chapterIndex: 0, totalChapters: chapters.length, imageCurrent: 0, imageTotal: 0 });

    try {
      if (!comicUrl) {
        throw new Error('No comic URL available. Please scrape the comic first.');
      }

      const startRes = await fetch(`${API_BASE}/download-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicUrl }),
        ...NO_STORE,
      });

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to start full download');
      }

      const { jobId } = await startRes.json();

      let fileName = '';
      while (true) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`${API_BASE}/download-full/${jobId}`, NO_STORE);
        const data = await statusRes.json();

        if (data.status === 'error') {
          throw new Error(data.error || 'Download failed');
        }

        if (data.status === 'done') {
          fileName = data.fileName;
          break;
        }

        if (data.totalChapters > 0) {
          setFullDownloadProgress({
            chapterIndex: (data.currentChapter || 0) - 1,
            totalChapters: data.totalChapters,
            imageCurrent: data.imageCurrent || 0,
            imageTotal: data.imageTotal || 0,
            chapterTitle: data.chapterTitle,
          });
        }
      }

      const downloadUrl = `${API_BASE}/download-file/${jobId}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus('done');
      setDownloadingChapterIndex(null);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      setStatus('error');
      setDownloadingChapterIndex(null);
    }
  }, [chapters, comicUrl]);

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
