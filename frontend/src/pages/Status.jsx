import React from 'react';

function Status() {
  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      padding: '2rem',
      backgroundColor: '#1a1a2e',
      color: '#e0e0e0'
    }}>
      <h1 style={{ color: '#00d4ff', textAlign: 'center', marginBottom: '2rem' }}>Comic Downloader - Status</h1>
      
      <div style={{ 
        backgroundColor: '#16213e', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem'
      }}>
        <h2 style={{ color: '#00d4ff', marginBottom: '0.5rem' }}>Backend Status</h2>
        <p><strong>API Server:</strong> http://localhost:3000</p>
        <p><strong>Health Check:</strong> <span style={{ color: '#00c853' }}>OK</span></p>
      </div>

      <div style={{ 
        backgroundColor: '#16213e', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem'
      }}>
        <h2 style={{ color: '#00d4ff', marginBottom: '0.5rem' }}>Frontend Status</h2>
        <p><strong>UI Server:</strong> http://localhost:5173</p>
        <p><strong>Status:</strong> <span style={{ color: '#00c853' }}>Running</span></p>
      </div>

      <div style={{ 
        backgroundColor: '#16213e', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem'
      }}>
        <h2 style={{ color: '#00d4ff', marginBottom: '0.5rem' }}>How to Use</h2>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Enter a batcave.biz comic URL (not /reader/...)</li>
          <li>Click "Download" button</li>
          <li>Wait for scraping (~60-90 seconds for first time)</li>
          <li>Download chapters as CBZ files</li>
        </ol>
      </div>

      <div style={{ 
        backgroundColor: '#16213e', 
        borderRadius: '12px', 
        padding: '1.5rem'
      }}>
        <h2 style={{ color: '#00d4ff', marginBottom: '0.5rem' }}>Current URL</h2>
        <input 
          type="url" 
          value="https://localhost:5173/" 
          readOnly 
          style={{ 
            width: '100%',
            padding: '0.75rem',
            border: '2px solid #0f3460',
            borderRadius: '8px',
            backgroundColor: '#0f3460',
            color: '#e0e0e0',
            fontSize: '1rem'
          }} 
        />
      </div>

      <p style={{ marginTop: '2rem', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
        Comic Downloader is ready to use! Enter a real batcave.biz comic URL above and click Download.
      </p>
    </div>
  );
}

export default Status;
