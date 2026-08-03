// Backend unit tests for config.js using Node's built-in test runner (node:test).
// Run with: npm test  (from backend/)
'use strict';
const test = require('node:test');
const assert = require('node:assert');

// Set allowed sites BEFORE requiring config so isAllowedUrl sees them.
process.env.TARGET_SITES =
  'https://xoxocomic.com,https://example-comic-site.com,https://batcave.biz';

const { getAllowedSites, getSiteForUrl, isAllowedUrl } = require('../src/config');

test('getAllowedSites parses comma-separated env into valid http sites', () => {
  const sites = getAllowedSites();
  assert.ok(Array.isArray(sites));
  assert.ok(sites.includes('https://xoxocomic.com'));
  assert.ok(sites.includes('https://batcave.biz'));
  // non-http entries are filtered out
  assert.ok(sites.every((s) => s.startsWith('http')));
});

test('getAllowedSites filters out entries that are not http(s)', () => {
  const original = process.env.TARGET_SITES;
  process.env.TARGET_SITES = 'https://xoxocomic.com,not-a-url,ftp://foo';
  const sites = getAllowedSites();
  assert.deepStrictEqual(sites, ['https://xoxocomic.com']);
  process.env.TARGET_SITES = original;
});

test('isAllowedUrl returns true for a URL matching an allowed hostname', () => {
  assert.strictEqual(isAllowedUrl('https://xoxocomic.com/comic/series'), true);
  assert.strictEqual(isAllowedUrl('https://batcave.biz/33051-xyz'), true);
});

test('isAllowedUrl returns false for disallowed or malformed URLs', () => {
  assert.strictEqual(isAllowedUrl('https://evil.example/shady'), false);
  assert.strictEqual(isAllowedUrl(''), false);
  assert.strictEqual(isAllowedUrl(undefined), false);
  assert.strictEqual(isAllowedUrl(12345), false);
  assert.strictEqual(isAllowedUrl(null), false);
});

test('isAllowedUrl is hostname-based, not a bare substring match', () => {
  // 'xoxocomic.com' must not match a lookalike like 'notxoxocomic.com'
  assert.strictEqual(isAllowedUrl('https://notxoxocomic.com/series'), false);
  // ...but the real host with a subdomain still matches
  assert.strictEqual(isAllowedUrl('https://www.xoxocomic.com/series'), true);
});

test('getSiteForUrl returns the matching allowed site', () => {
  const site = getSiteForUrl('https://xoxocomic.com/comic');
  assert.strictEqual(site, 'https://xoxocomic.com');
  assert.strictEqual(getSiteForUrl('https://elsewhere.com/x'), undefined);
});
