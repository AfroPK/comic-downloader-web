function UrlInput({ url, setUrl, onScrape, isLoading }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onScrape();
    }
  };

  return (
    <div className="input-section">
      <div className="input-wrapper">
        <input
          type="text"
          placeholder=""
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
      </div>
      <button
        className="btn btn-primary"
        onClick={onScrape}
        disabled={isLoading || !url.trim()}
      >
        {isLoading ? 'Loading...' : 'Download'}
      </button>
    </div>
  );
}

export default UrlInput;
