import { useState, useCallback, useEffect } from 'react';

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

/**
 * Establishes and manages an EventSource connection for real-time progress updates.
 * @param {string} url The base URL to connect to (e.g., /api/download).
 * @param {number} jobId The job ID to track.
 * @param {(progress: number, total: number) => void} onProgress Callback function for progress updates.
 * @returns {{cleanup: () => void}} Object containing a cleanup function to close the stream.
 */
function connectProgressStream(url, jobId, onProgress) {
  const eventSource = new EventSource(`${url}?jobId=${jobId}`);

  eventSource.onmessage = (event) => {
    try {
      // Assuming 'message' event carries JSON payload like: { progress: 50, total: 100 }
      const data = JSON.parse(event.data);
      if (typeof data.progress === 'number' && typeof data.total === 'number') {
        onProgress(data.progress, data.total);
      } else {
         console.warn("Received message event without valid progress payload:", data);
      }
    } catch (e) {
      console.error("Error parsing EventSource message:", e);
    }
  };

  eventSource.onerror = (err) => {
    console.error("EventSource failed to connect or stream:", err);
  };

  const cleanup = () => {
    if (eventSource) {
        eventSource.close();
    }
  };

  return { cleanup };
}


/**
 * Polls a job status, prioritizing EventSource streaming for progress updates.
 * @param {string} jobId The ID of the running job.
 * @param {string} endpoint The API endpoint (e.g., /scrape).
 * @param {(progress: number, total: number) => void} onProgressCallback Callback function to update progress state.
 * @returns {Promise<any>} A promise that resolves with the final job result.
 */
async function pollJob(jobId, endpoint, onProgressCallback) {
    return new Promise((resolve, reject) => {
        let interval;

        // Determine if EventSource streaming is likely intended for this endpoint (e.g., download processes)
        const useStreaming = endpoint === 'scrape-chapter' || endpoint === 'download'; 

        if (useStreaming) {
            const eventStreamUrl = `${API_BASE}${endpoint}`;
            // 1. Set up EventSource for continuous progress updates
            const { cleanup } = connectProgressStream(eventStreamUrl, jobId, onProgressCallback);
            
            let resolveCalled = false;

            interval = setInterval(() => {
                if (resolveCalled) return;

                fetch(`${API_BASE}${endpoint}/${jobId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data.status) return reject(new Error("Unknown API status response"));
                        
                        if (data.status === 'done') {
                            clearInterval(interval);
                            cleanup();
                            resolve(data.result || data); // Resolve with result or full data object
                        } else if (data.status === 'error') {
                            clearInterval(interval);
                            cleanup();
                            reject(new Error(data.error || 'Job failed during polling check'));
                        } else {
                            // Progress is handled by EventSource, but we still need to poll for status checks
                            if (onProgressCallback && data.progress !== undefined && data.total > 0) {
                                onProgressCallback(data.progress, data.total);
                            }
                        }
                    })
                    .catch(err => {
                        clearInterval(interval);
                        cleanup();
                        reject(err);
                    });
            }, 2000);

            // Initial check to start the process chain
            fetch(`${API_BASE}${endpoint}/${jobId}`)
                .then(res => res.json())
                .then(data => {
                     if (data.status === 'done') return data; // Handle immediate completion
                })
                .catch(() => {});


        } else {
            // Fallback Polling for initial scrape job, keeping original logic structure
             interval = setInterval(() => {
                fetch(`${API_BASE}${endpoint}/${jobId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'done') {
                            clearInterval(interval);
                            resolve(data.result);
                        } else if (data.status === 'error') {
                            clearInterval(interval);
                            reject(new Error(data.error));
                        } else {
                            // Report progress while polling
                            if (onProgressCallback && data.progress !== undefined && data.total > 0) {
                                onProgressCallback(data.progress, data.total);
                            }
                        }
                    })
                    .catch(() => {});
            }, 2000); // Original poll interval

            // Initial check for fallback polling
             fetch(`${API_BASE}${endpoint}/${jobId}`)
                .then(res => res.json())
                .then(data => {
                     if (data.status === 'done') return data;
                })
                .catch(() => {});
        }
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

  // Cleanup logic for state management (optional but good practice)
  useEffect(() => {
    return () => {
        console.log("useScrape hook cleanup initiated.");
    };
  }, []);


  const scrape = useCallback(async (url) => {
    setStatus('scraping');
    setError('');
    setChapters([]);
    setComicTitle('');
    setComicUrl(url);
    setProgress(0);

    let progressInterval;

    try {
      // Temporary visual progress update interval
      progressInterval = setInterval(() => {
        setProgress(prev => (Math.min(95, prev + Math.random() * 15)));
      }, 500);

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
      
      // Use the refactored pollJob/progress logic (which now handles progress updates)
      const result = await pollJob(jobId, '/scrape', (current, total) => {
          setProgress(Math.max(10, current)); // Update local state with streamed value
        });

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
      // Use EventSource for progress tracking in chapter download, passing callback handler
      const result = await pollJob(jobId, '/scrape-chapter', (current, total) => {
        setDownloadProgress({ current, total });
      });

      if (!result.images || result.images.length === 0) {
        throw new Error('No images received for this chapter');
      }


      const content = await createCbzBlob(result.images);


      // Build filename: Chapter title only, stripping all non-alphanumeric chars (keep #)
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
      });

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to start full download');
      }

      const { jobId } = await startRes.json();

      // Poll for status using the original 3-second interval wait, as it is a disk-based process.
      let fileName = '';
      while (true) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`${API_BASE}/download-full/${jobId}`);
        const data = await statusRes.json();

        if (data.status === 'error') {
          throw new Error(data.error || 'Download failed');
        }

        if (data.status === 'done') {
          fileName = data.fileName;
          break;
        }

        // Update progress
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

      // Trigger file download (DOM manipulation is fine here)
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