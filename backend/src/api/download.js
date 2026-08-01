const express = require('express');

/**
 * Handles simple comic download requests by exposing the handler function.
 */
async function handleDownload(req, res) {
    const { comicUrl } = req.body;

    if (!comicUrl) {
        return res.status(400).json({ error: 'comicUrl is required' });
    }

    console.log('[api/download] Request received for comic download:', comicUrl);

    // In a real application, the job ID generation and subsequent background task triggering 
    // would be managed by the centralized server logic in server.js or a dedicated service layer.
    const jobId = Date.now().toString(); 

    res.json({ status: 'pending', jobId });
}

module.exports = { handleDownload };
