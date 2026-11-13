function issueNumber(title, fallbackIndex) {
  const hash = /#\s*(\d+)/.exec(title || '');
  if (hash) return hash[1].replace(/^0+(?=\d)/, '');
  return String(fallbackIndex + 1);
}

function ChapterList({ chapters, onDownloadChapter, isDownloading, downloadingChapterIndex, downloadProgress }) {
  return (
    <>
      <div className="chapter-toolbar">
        <span className="chapter-toolbar__title">Issues</span>
        <span className="badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" />
          </svg>
          Click a card to save a .cbz
        </span>
      </div>
      <div className="chapter-list">
        {chapters.map((chapter, index) => {
          const active = downloadingChapterIndex === index;
          const pct = downloadProgress.total ? (downloadProgress.current / downloadProgress.total) * 100 : 0;
          const meta = chapter.images && chapter.images.length > 0
            ? `${chapter.images.length} images`
            : 'Ready to download';

          return (
            <div className={`chapter-item ${active ? 'is-active' : ''}`} key={index}>
              <div className="chapter-info">
                <span className="issue-badge">#{issueNumber(chapter.title, index)}</span>
                <div className="chapter-info__text">
                  <span className="chapter-info__title" title={chapter.title || `Chapter ${index + 1}`}>
                    {chapter.title || `Chapter ${index + 1}`}
                  </span>
                  <span className="chapter-info__meta" style={chapter.error ? { color: 'var(--err)' } : undefined}>
                    {chapter.error ? chapter.error : meta}
                  </span>
                </div>
              </div>
              <button
                className="btn btn-success"
                onClick={() => onDownloadChapter(chapter.url, chapter.title, index)}
                disabled={isDownloading}
                aria-label={`Download ${chapter.title || 'chapter'} as CBZ`}
              >
                {active ? (
                  <>
                    <span className="btn__fill" style={{ width: `${pct}%` }} />
                    <span className="btn__label">{downloadProgress.total ? `${Math.round(pct)}%` : '…'}</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" />
                    </svg>
                    CBZ
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default ChapterList;
