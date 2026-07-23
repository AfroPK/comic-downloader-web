#!/usr/bin/env node

// This script ensures Chrome/Chromium is installed for Puppeteer
// It's specifically designed to work in Render's environment
// If installation fails, it continues anyway so the build doesn't fail

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('[postinstall] Installing Chrome for Puppeteer...');

function tryInstall(browserType) {
  try {
    console.log(`[postinstall] Trying to install ${browserType}...`);
    execSync(`npx puppeteer browsers install ${browserType}`, {
      stdio: 'inherit',
      cwd: __dirname,
      timeout: 300000 // 5 minute timeout
    });
    console.log(`[postinstall] ${browserType} installed successfully.`);
    return true;
  } catch (error) {
    console.error(`[postinstall] Failed to install ${browserType}:`, error.message);
    return false;
  }
}

// Try Chrome first, then Chromium as fallback
let installed = tryInstall('chrome');
if (!installed) {
  installed = tryInstall('chromium');
}

// Verify installation
const cachePath = path.join(os.homedir(), '.cache', 'puppeteer');
if (fs.existsSync(cachePath)) {
  console.log('[postinstall] Chrome cache directory exists:', cachePath);
  try {
    const contents = fs.readdirSync(cachePath);
    console.log('[postinstall] Cache contents:', contents);
  } catch (e) {
    console.log('[postinstall] Could not read cache contents:', e.message);
  }
} else {
  console.log('[postinstall] Warning: Chrome cache directory not found at', cachePath);
  console.log('[postinstall] Chrome may be installed elsewhere or installation failed');
}

console.log('[postinstall] Postinstall completed.');
