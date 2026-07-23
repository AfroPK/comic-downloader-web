function FullDownloadSection({ comicTitle, chapters, onDownloadFull, isDownloading }) {
  return (
    <div className="info-card full-download-section">
      <h2>Download Full Comic</h2>
      <p>{chapters.length} chapters</p>
      <button
        className="btn btn-warning"
        onClick={onDownloadFull}
        disabled={isDownloading}
        style={{ marginTop: '0.75rem' }}
      >
        {isDownloading ? (
          <>
            <span className="spinner"></span>
            Downloading...
          </>
        ) : (
          'Download Full Comic'
        )}
      </button>
    </div>
  );
}

export default FullDownloadSection;
