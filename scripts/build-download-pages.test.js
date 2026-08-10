'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, renderNotes } = require('./build-download-pages');

test('escapeHtml escapes &, <, >', () => {
  assert.equal(escapeHtml('<b>a & b</b>'), '&lt;b&gt;a &amp; b&lt;/b&gt;');
});

test('renderNotes converts heading, list, bold, code, link', () => {
  const md = '## v1.0\n- **bold** item\n- `code` item\n- [link](https://example.com)';
  const html = renderNotes(md);
  assert.equal(
    html,
    '<h3>v1.0</h3><ul><li><strong>bold</strong> item</li>' +
    '<li><code>code</code> item</li>' +
    '<li><a href="https://example.com" target="_blank" rel="noopener">link</a></li></ul>'
  );
});

test('renderNotes treats blank lines as paragraph/list separators', () => {
  const md = 'intro line\n\n- item one';
  const html = renderNotes(md);
  assert.equal(html, '<p>intro line</p><ul><li>item one</li></ul>');
});

const { matchAsset, selectPlatformReleases } = require('./build-download-pages');

test('matchAsset finds first asset matching the pattern (case-insensitive)', () => {
  const release = { assets: [{ name: 'AdbTool-1.0.0.exe' }, { name: 'AdbTool-1.0.0-Mac.dmg' }] };
  const asset = matchAsset(release, /\.(dmg|pkg)$|mac/i);
  assert.equal(asset.name, 'AdbTool-1.0.0-Mac.dmg');
});

test('matchAsset returns undefined when nothing matches', () => {
  const release = { assets: [{ name: 'AdbTool-1.0.0.exe' }] };
  assert.equal(matchAsset(release, /\.(dmg|pkg)$|mac/i), undefined);
});

test('selectPlatformReleases keeps only releases with a matching asset, in given order', () => {
  const releases = [
    { tag_name: 'v2', published_at: '2026-02-01T00:00:00Z', assets: [{ name: 'app-2-mac.dmg' }] },
    { tag_name: 'v1', published_at: '2026-01-01T00:00:00Z', assets: [{ name: 'app-1.exe' }] }
  ];
  const platform = { label: 'macOS', assetPattern: '\\.(dmg|pkg)$|mac' };
  const matches = selectPlatformReleases(releases, platform);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].release.tag_name, 'v2');
  assert.equal(matches[0].asset.name, 'app-2-mac.dmg');
});
