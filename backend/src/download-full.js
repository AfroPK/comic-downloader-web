const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const TMP_DIR = process.env.TMPDIR || '/tmp';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeFileName(str) {
  return str.replace(/[^a-zA-Z0-9#]/g, '');
}

async function createCbzOnDisk(images, outputPath) {
  const zip = new JSZip();
  for (let i = 0; i < images.length; i++) {
    const imgDataUrl = images[i];
    const [header, base64] = imgDataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binary = Buffer.from(base64, 'base64');
    const ext = mime.split('/')[1] || 'jpg';
    zip.file(`page_${String(i + 1).padStart(3, '0')}.${ext}`, binary);
  }
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, content);
}

async function createMasterZip(cbzPaths, outputPath) {
  const zip = new JSZip();
  for (const { name, path: cbzPath } of cbzPaths) {
    const data = fs.readFileSync(cbzPath);
    zip.file(name, data);
  }
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, content);
}

function cleanupDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = {
  TMP_DIR,
  ensureDir,
  sanitizeFileName,
  createCbzOnDisk,
  createMasterZip,
  cleanupDir,
};
