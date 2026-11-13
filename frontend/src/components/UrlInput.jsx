function UrlInput({ url, setUrl, onScrape, isLoading }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onScrape();
  };

  return (
    <div className="input-section">
      <span className="input-section__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
        </svg>
      </span>
      <input
        type="text"
        inputMode="url"
        placeholder="Paste a comic URL…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        aria-label="Comic URL"
      />
      <button
        className="btn btn-primary"
        onClick={onScrape}
        disabled={isLoading || !url.trim()}
      >
        {isLoading ? (
          <>
            <span className="spinner" /> Scanning…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" />
            </svg>
            Get issues
          </>
        )}
      </button>
    </div>
  );
}

export default UrlInput;
