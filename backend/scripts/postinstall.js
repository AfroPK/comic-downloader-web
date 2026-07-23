#!/usr/bin/env node

// This script ensures Chrome/Chromium is installed for Puppeteer
// It's specifically designed to work in Render's environment

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[postinstall] Installing Chrome for Puppeteer...');

try {
  // Install Chrome (not Chromium) to match what Puppeteer expects
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('[postinstall] Chrome installed successfully.');
} catch (error) {
  console.error('[postinstall] Failed to install Chrome:', error.message);
  console.log('[postinstall] Trying with Chromium as fallback...');
  
  try {
    execSync('npx puppeteer browsers install chromium', {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('[postinstall] Chromium installed successfully.');
  } catch (fallbackError) {
    console.error('[postinstall] Failed to install Chromium as fallback:', fallbackError.message);
    process.exit(1);
  }
}

// Verify installation
const cachePath = path.join(require('os').homedir(), '.cache', 'puppeteer');
if (fs.existsSync(cachePath)) {
  console.log('[postinstall] Chrome cache directory exists:', cachePath);
  const contents = fs.readdirSync(cachePath);
  console.log('[postinstall] Cache contents:', contents);
} else {
  console.log('[postinstall] Warning: Chrome cache directory not found at', cachePath);
}
