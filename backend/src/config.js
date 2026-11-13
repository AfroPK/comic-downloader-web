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

// Compare by real hostname, not substring. Prevents lookalike/evil domains
// (e.g. "xoxocomic.com.evil.com", "notxoxocomic.com") from passing an allowlist
// that naively checks `url.includes(host)`. Allows the exact host or a subdomain.
function isHostMatch(url, allowedHost) {
  if (typeof url !== 'string') return false;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false; // malformed URL is never allowed
  }
  return host === allowedHost || host.endsWith('.' + allowedHost);
}

function getSiteForUrl(url) {
  if (typeof url !== 'string') return undefined;
  const sites = getAllowedSites();
  return sites.find((site) => {
    try {
      return isHostMatch(url, new URL(site).hostname.toLowerCase());
    } catch {
      return false;
    }
  });
}

function isAllowedUrl(url) {
  if (typeof url !== 'string') return false;
  return getAllowedSites().some((site) => {
    try {
      return isHostMatch(url, new URL(site).hostname.toLowerCase());
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
