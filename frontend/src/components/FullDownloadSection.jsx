function FullDownloadSection({ comicTitle, chapters, onDownloadFull, isDownloading, fullDownloadProgress }) {
  const { chapterIndex, totalChapters, imageCurrent, imageTotal } = fullDownloadProgress || {};
  const hasProgress = totalChapters > 0;
  const chapterPct = hasProgress && imageTotal > 0
    ? Math.round((imageCurrent / imageTotal) * 100)
    : 0;

  return (
    <div className="info-card full-download-section">
      <h2>Download All Chapters</h2>
      <p>{chapters.length} chapters</p>
      <button
        className="btn btn-warning"
        onClick={onDownloadFull}
        disabled={isDownloading}
        style={isDownloading ? { position: 'relative', overflow: 'hidden', minWidth: '140px' } : { marginTop: '0.75rem' }}
      >
        {isDownloading ? (
          <>
            <span style={{ position: 'relative', zIndex: 1 }}>
              {hasProgress
                ? `Ch ${chapterIndex + 1}/${totalChapters} - ${chapterPct}%`
                : 'Starting...'}
            </span>
            {hasProgress && imageTotal > 0 && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${chapterPct}%`,
                  backgroundColor: 'rgba(255,255,255,0.35)',
                  transition: 'width 0.3s ease',
                  zIndex: 0,
                }}
              />
            )}
          </>
        ) : (
          'Download'
        )}
      </button>
    </div>
  );
}

export default FullDownloadSection;
