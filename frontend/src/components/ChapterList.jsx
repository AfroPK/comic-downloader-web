function ChapterList({ chapters, onDownloadChapter, isDownloading, downloadingChapterIndex }) {
  return (
    <div className="info-card">
      <h2>Chapters</h2>
      <div className="chapter-list">
        {chapters.map((chapter, index) => {
          const isThisChapterDownloading = downloadingChapterIndex === index;
          
          return (
            <div className="chapter-item" key={index}>
              <div className="chapter-info">
                <span>{chapter.title || `Chapter ${index + 1}`}</span>
                <span>
                  {chapter.images && chapter.images.length > 0
                    ? `${chapter.images.length} images`
                    : 'Ready to download'}
                </span>
                {chapter.error && (
                  <span style={{ color: '#ff5252' }}> — {chapter.error}</span>
                )}
              </div>
              <button
                className="btn btn-success"
                onClick={() => onDownloadChapter(chapter.url, chapter.title, index)}
                disabled={isDownloading}
              >
                {isThisChapterDownloading ? (
                  <>
                    <span className="spinner"></span>
                    Downloading
                  </>
                ) : (
                  'CBZ'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChapterList;
