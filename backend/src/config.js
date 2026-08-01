// Central site configuration
// For local use, set TARGET_SITES in a .env file or environment:
//   TARGET_SITES=https://example-comic-site.com
// Multiple sites can be comma-separated.
// By default no sites are allowed until configured by the user.

function getAllowedSites() {
  const sitesEnv = process.env.TARGET_SITES || '';
  if (!sitesEnv) return [];

  return sitesEnv
    .split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith('http'));
}

function getSiteForUrl(url) {
  if (typeof url !== 'string') return undefined;
  const sites = getAllowedSites();
  return sites.find(site => {
    try {
      return url.includes(new URL(site).hostname);
    } catch {
      return false;
    }
  });
}

function isAllowedUrl(url) {
  if (typeof url !== 'string') return false;
  return getAllowedSites().some(site => {
    try {
      return url.includes(new URL(site).hostname);
    } catch {
      return false;
    }
  });
}

module.exports = {
  getAllowedSites,
  getSiteForUrl,
  isAllowedUrl,
};
