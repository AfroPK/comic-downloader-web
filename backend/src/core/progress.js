const clients = new Set();

/**
 * Adds a new SSE client connection by setting appropriate headers on the response object.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
function addClient(req, res) {
    // Ensure headers are set for Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no' // For NGINX compatibility
    });

    // Store the client connection reference
    clients.add(res);

    console.log('Client added. Total active clients:', clients.size);
}

/**
 * Broadcasts a progress message to all active SSE clients.
 * @param {string} message - The progress message content.
 */
function broadcast(message) {
    // Format the message according to SSE specification: data: <content>\n\n
    const sseMessage = `data: ${JSON.stringify(message)}\n\n`;

    if (clients.size === 0) {
        console.log('No active clients to broadcast to.');
        return;
    }

    let successfullyBroadcasted = 0;
    for (const clientRes of clients) {
        try {
            clientRes.write(sseMessage);
            successfullyBroadcasted++;
        } catch (e) {
            console.error('Error broadcasting to a client:', e);
            // If writing fails, assume the connection is dead and remove it
            removeClient(clientRes);
        }
    }

    if (successfullyBroadcasted > 0) {
        // Flush all buffered data immediately
        Promise.all(Array.from(clients)).then(async () => {
             for(const clientRes of clients){
                 try {
                    await new Promise((resolve) => {
                        clientRes.flush(() => {
                            console.log('Data flushed successfully.');
                            resolve();
                        });
                    });
                } catch (e) {
                    console.error("Failed to flush data.", e);
                    removeClient(clientRes); // Handle failure during flush too
                }
            }

        });
    }
}

/**
 * Removes a client connection from the active set.
 * @param {object} res - The Express response object associated with the client.
 */
function removeClient(res) {
    if (clients.delete(res)) {
        console.log('Client removed successfully. Total active clients:', clients.size);
    } else {
        console.warn('Attempted to remove a non-existent client.');
    }
}

/**
 * Broadcasts an error event to all connected SSE clients.
 * @param {string} errMessage - The error description.
 */
function broadcastError(errMessage) {
    broadcast({ type: 'error', message: errMessage, timestamp: new Date().toISOString() });
}

module.exports = {
    addClient,
    broadcast,
    broadcastError,
    removeClient
};