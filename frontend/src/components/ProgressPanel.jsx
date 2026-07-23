function ProgressPanel({ progress, message }) {
  const roundedProgress = Math.round(progress);
  
  return (
    <div className="info-card">
      <p>{message}</p>
      <div className="progress-bar">
        <div style={{ width: `${roundedProgress}%` }} className="progress-fill" />
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#888' }}>
        {roundedProgress}%
      </p>
    </div>
  );
}

export default ProgressPanel;
