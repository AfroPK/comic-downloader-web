// Central site configuration
// Supports multiple sites via comma-separated list in TARGET_SITES
// Example: TARGET_SITES=https://site1.com,https://site2.com,https://site3.com

function getAllowedSites() {
  const sitesEnv = process.env.TARGET_SITES || process.env.TARGET_SITE || '';
  if (!sitesEnv) return [];

  return sitesEnv
    .split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith('http'));
}

function getSiteForUrl(url) {
  if (typeof url !== 'string') return undefined;
  const sites = getAllowedSites();
  return sites.find(site => url.includes(new URL(site).hostname));
}

function isAllowedUrl(url) {
  if (typeof url !== 'string') return false;
  return getAllowedSites().some(site => url.includes(new URL(site).hostname));
}

module.exports = {
  getAllowedSites,
  getSiteForUrl,
  isAllowedUrl,
};
