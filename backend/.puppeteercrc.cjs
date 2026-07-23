const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes cache location to inside node_modules so Render keeps it
  cacheDirectory: join(__dirname, 'node_modules', '.puppeteer'),
};
