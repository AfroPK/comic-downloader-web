function ChapterList({ chapters, onDownloadChapter, isDownloading, downloadingChapterIndex, downloadProgress }) {
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
                style={isThisChapterDownloading ? { position: 'relative', overflow: 'hidden', minWidth: '80px' } : {}}
              >
                {isThisChapterDownloading ? (
                  <>
                    <span style={{ position: 'relative', zIndex: 1 }}>
                      {downloadProgress.total > 0
                        ? `${Math.round((downloadProgress.current / downloadProgress.total) * 100)}%`
                        : '...'}
                    </span>
                    {downloadProgress.total > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
                          backgroundColor: 'rgba(255,255,255,0.35)',
                          transition: 'width 0.3s ease',
                          zIndex: 0,
                        }}
                      />
                    )}
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
