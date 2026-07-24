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

async function pollJob(jobId, endpoint) {
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
    setStatus('downloading');
    setDownloadingChapterIndex(index);
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
      const result = await pollJob(jobId, '/scrape-chapter');

      if (!result.images || result.images.length === 0) {
        throw new Error('No images received for this chapter');
      }

      const zip = new JSZip();
      for (let i = 0; i < result.images.length; i++) {
        const imgDataUrl = result.images[i];
        const blob = dataUrlToBlob(imgDataUrl);
        const ext = blob.type.split('/')[1] || 'jpg';
        zip.file(`page_${String(i + 1).padStart(3, '0')}.${ext}`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });

      // Build filename: ComicName+IssueNumber.cbz
      const safeComicTitle = comicTitle.replace(/[^a-zA-Z0-9\s_-]/g, '').trim();

      // Strip comic name prefix from chapter title to get just the issue/chapter part
      let chapterPart = chapterTitle || `Chapter ${index + 1}`;
      // Remove comic title prefix (case-insensitive, partial match)
      const comicWords = safeComicTitle.split(/\s+/).filter(w => w.length > 2);
      if (comicWords.length > 0) {
        // Try to find where comic name ends and issue info begins
        // Look for common patterns: "Issue #", "Chapter", "Vol.", "#"
        const issueMatch = chapterPart.match(/(Issue\s+#?\d+|Chapter\s+\d+|Vol\.?\s*\d+|#\d+|\d+)$/i);
        if (issueMatch) {
          chapterPart = issueMatch[0];
        }
      }
      const safeChapterPart = chapterPart.replace(/[^a-zA-Z0-9\s_-]/g, '').trim();
      const fileName = `${safeComicTitle}+${safeChapterPart}.cbz`;
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
    setStatus('downloading');
    setError('');

    try {
      const zip = new JSZip();
      const comicFolder = zip.folder(comicTitle.replace(/[^a-zA-Z0-9_-]/g, '_'));

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        setDownloadingChapterIndex(i);

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
        const data = await pollJob(jobId, '/scrape-chapter');

        if (!data.images || data.images.length === 0) {
          console.warn(`Skipping chapter ${chapter.title} - no images`);
          continue;
        }

        const folderName = chapter.title.replace(/[^a-zA-Z0-9_-]/g, '_');
        const folder = comicFolder.folder(folderName);
        for (let j = 0; j < data.images.length; j++) {
          const imgDataUrl = data.images[j];
          const blob = dataUrlToBlob(imgDataUrl);
          const ext = blob.type.split('/')[1] || 'jpg';
          folder.file(`page_${String(j + 1).padStart(3, '0')}.${ext}`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${comicTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.cbz`);

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
    scrape,
    downloadChapter,
    downloadFullComic,
  };
}

export { useScrape };
