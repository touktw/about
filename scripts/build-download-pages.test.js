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

const { renderPlatformCard } = require('./build-download-pages');

const PROJECT = { repoUrl: 'https://github.com/touktw/AdbTool' };

test('renderPlatformCard shows a static TBD card regardless of state', () => {
  const platform = { label: 'Windows', tbd: true };
  const html = renderPlatformCard(PROJECT, platform, {});
  assert.match(html, /class="tbd-badge">TBD/);
  assert.match(html, /Windows 버전은 아직 준비 중입니다/);
});

test('renderPlatformCard shows an error fallback when apiError is set', () => {
  const platform = { label: 'macOS' };
  const html = renderPlatformCard(PROJECT, platform, { apiError: true });
  assert.match(html, /릴리스 목록을 불러오지 못했습니다/);
  assert.match(html, /https:\/\/github\.com\/touktw\/AdbTool\/releases/);
});

test('renderPlatformCard shows empty state when there are no matches', () => {
  const platform = { label: 'macOS' };
  const html = renderPlatformCard(PROJECT, platform, { matches: [] });
  assert.match(html, /아직 macOS 릴리스가 없습니다/);
});

test('renderPlatformCard renders latest release and collapses older ones', () => {
  const platform = { label: 'macOS' };
  const matches = [
    {
      release: { tag_name: 'v2', name: 'v2', published_at: '2026-02-01T00:00:00Z', body: '변경사항' },
      asset: { name: 'app-2.dmg', browser_download_url: 'https://example.com/2.dmg' }
    },
    {
      release: { tag_name: 'v1', name: 'v1', published_at: '2026-01-01T00:00:00Z', body: '' },
      asset: { name: 'app-1.dmg', browser_download_url: 'https://example.com/1.dmg' }
    }
  ];
  const html = renderPlatformCard(PROJECT, platform, { matches });
  assert.match(html, /class="badge">최신 버전/);
  assert.match(html, /app-2\.dmg 다운로드/);
  assert.match(html, /class="older"/);
  assert.match(html, /app-1\.dmg 다운로드/);
});

const { renderProjectPage, buildProject } = require('./build-download-pages');

test('renderProjectPage embeds title, repo link, license, and platform cards', () => {
  const project = { name: 'AdbTool', tagline: '데스크탑용 ADB 툴', repoUrl: 'https://github.com/touktw/AdbTool', license: 'Apache License 2.0' };
  const html = renderProjectPage(project, '<div class="platform-card">CARD</div>');
  assert.match(html, /<title>다운로드 · AdbTool<\/title>/);
  assert.match(html, /href="https:\/\/github\.com\/touktw\/AdbTool"/);
  assert.match(html, /<div class="platform-card">CARD<\/div>/);
  assert.match(html, /Apache License 2\.0/);
  assert.match(html, /href="\/style\.css"/);
});

test('buildProject falls back to an error card per platform when mock file is missing', async () => {
  const project = {
    name: 'AdbTool', repoName: 'AdbTool', repoUrl: 'https://github.com/touktw/AdbTool', license: 'x',
    platforms: [{ label: 'macOS', assetPattern: '\\.dmg$' }]
  };
  const html = await buildProject(project, { mockDir: '/nonexistent-dir-for-plan-task7' });
  assert.match(html, /릴리스 목록을 불러오지 못했습니다/);
});
