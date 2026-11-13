function FullDownloadSection({ comicTitle, chapters, onDownloadFull, isDownloading, fullDownloadProgress }) {
  const { chapterIndex = 0, totalChapters = 0, imageCurrent = 0, imageTotal = 0, chapterTitle } = fullDownloadProgress || {};
  const hasProgress = totalChapters > 0 && isDownloading;
  const chapterPct = hasProgress && imageTotal > 0 ? Math.round((imageCurrent / imageTotal) * 100) : 0;
  const overallPct = hasProgress && totalChapters > 0
    ? Math.min(100, Math.round(((chapterIndex - 1 + (imageTotal ? imageCurrent / imageTotal : 0)) / totalChapters) * 100))
    : 0;

  return (
    <div className="card full-download">
      <h2>Get the whole series</h2>
      <p>
        Bundle all <b>{chapters.length}</b> issues into a single archive — server-side, no per-click babysitting.
      </p>
      <button
        className="btn btn-primary"
        onClick={onDownloadFull}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <>
            <span className="btn__fill" style={{ width: `${hasProgress ? overallPct : 0}%` }} />
            <span className="btn__label">
              {hasProgress
                ? `Ch ${chapterIndex}/${totalChapters} · ${chapterPct}%`
                : <>Starting…</>}
            </span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 21h16" />
            </svg>
            Download all {chapters.length} issues
          </>
        )}
      </button>
      {hasProgress && (
        <div style={{ maxWidth: 420, margin: '1.25rem auto 0', textAlign: 'left' }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
          <div className="progress-meta">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
              {chapterTitle || 'Working…'}
            </span>
            <span className="pct">{overallPct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FullDownloadSection;
