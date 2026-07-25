const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess;
let frontendServer;
let backendStartedByUs = false;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function startFrontendServer(distPath, port) {
  return new Promise((resolve, reject) => {
    frontendServer = http.createServer((req, res) => {
      const urlPath = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
      let filePath = path.join(distPath, decodeURIComponent(urlPath));

      const stat = fs.statSync(filePath, { throwIfNoEntry: false });
      if (stat?.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        filePath = path.join(distPath, 'index.html');
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
        res.end(data);
      });
    });

    frontendServer.listen(port, '127.0.0.1', (err) => {
      if (err) return reject(err);
      console.log(`Frontend server running on http://127.0.0.1:${port}`);
      resolve();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('http://127.0.0.1:5174/');
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[renderer:${level}]`, message);
  });
}

function startBackend() {
  const isPackaged = app.isPackaged;
  const backendPath = isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '../backend');

  const serverScript = path.join(backendPath, 'src/server.js');
  console.log('Starting backend from:', backendPath);

  if (!fs.existsSync(serverScript)) {
    console.error('Backend server script not found:', serverScript);
    return;
  }

  backendProcess = spawn('node', [serverScript], {
    cwd: backendPath,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  backendProcess.stdout.on('data', (data) => {
    console.log('[backend]', data.toString().trim());
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('[backend]', data.toString().trim());
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log('Backend exited with code:', code);
  });

  backendStartedByUs = true;
}

async function isBackendRunning(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isBackendRunning(url)) return true;
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

app.whenReady().then(async () => {
  const backendUrl = 'http://localhost:3000/api/health';
  const distPath = path.join(__dirname, '../frontend/dist');

  if (!fs.existsSync(distPath)) {
    console.error('Frontend dist not found at:', distPath);
  }

  await startFrontendServer(distPath, 5174);

  if (!(await isBackendRunning(backendUrl))) {
    startBackend();
  } else {
    console.log('Backend already running, reusing existing process');
  }

  const ready = await waitForBackend(backendUrl);
  if (!ready) {
    console.error('Backend did not start in time');
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (frontendServer) {
    frontendServer.close();
  }
  if (backendProcess && backendStartedByUs) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess && backendStartedByUs) {
    backendProcess.kill();
  }
});
