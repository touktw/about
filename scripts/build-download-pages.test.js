'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { escapeHtml, renderNotes } = require('./build-download-pages');

test('escapeHtml escapes &, <, >', () => {
  assert.equal(escapeHtml('<b>a & b</b>'), '&lt;b&gt;a &amp; b&lt;/b&gt;');
});

test('escapeHtml escapes double and single quotes', () => {
  assert.equal(escapeHtml(`a "b" 'c'`), 'a &quot;b&quot; &#39;c&#39;');
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

test('renderNotes does not let a link URL break out of the href attribute', () => {
  const md = '[x](https://a" onmouseover="alert(1))';
  const html = renderNotes(md);
  // The whole quoted href value (up to the first literal ") must be the fully-escaped
  // URL -- if the raw " were left unescaped, this capture would stop early at "https://a"
  // and "onmouseover=..." would become a second, live HTML attribute.
  const hrefMatch = html.match(/href="([^"]*)"/);
  assert.ok(hrefMatch, 'expected a single well-formed href attribute');
  assert.equal(hrefMatch[1], 'https://a&quot; onmouseover=&quot;alert(1');
});

test('renderNotes refuses to linkify a non-http(s) scheme like javascript:', () => {
  const md = '[click](javascript:alert(1))';
  const html = renderNotes(md);
  assert.doesNotMatch(html, /<a /);
  assert.match(html, /\[click\]\(javascript:alert\(1\)\)/);
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

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'releases');

test('buildProject orders the latest release before older ones in the rendered output', async () => {
  const project = {
    name: 'AdbTool', repoName: 'AdbTool', repoUrl: 'https://github.com/touktw/AdbTool', license: 'x',
    platforms: [{ label: 'macOS', assetPattern: '\\.(dmg|pkg)$|mac' }]
  };
  const html = await buildProject(project, { mockDir: FIXTURES_DIR });
  const idxLatest = html.indexOf('AdbTool-1.1.0-mac.dmg');
  const idxOlder = html.indexOf('AdbTool-1.0.1-mac.dmg');
  assert.notEqual(idxLatest, -1, 'latest release asset should be present');
  assert.notEqual(idxOlder, -1, 'older release asset should be present');
  assert.ok(idxLatest < idxOlder, 'v1.1.0 (newest) should render before v1.0.1 (older)');
  assert.match(html, /class="badge">최신 버전/);
});

test('buildProject excludes a release with no matching-pattern asset from that platform card', async () => {
  const project = {
    name: 'AdbTool', repoName: 'AdbTool', repoUrl: 'https://github.com/touktw/AdbTool', license: 'x',
    platforms: [{ label: 'macOS', assetPattern: '\\.(dmg|pkg)$|mac' }]
  };
  const html = await buildProject(project, { mockDir: FIXTURES_DIR });
  // v0.9.0 only ships a Windows .exe asset in the fixture — it must not surface in the macOS card.
  assert.doesNotMatch(html, /v0\.9\.0/);
});

test('buildProject excludes draft releases even when they have a matching asset', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-pages-draft-'));
  fs.writeFileSync(path.join(dir, 'DraftApp.json'), JSON.stringify([
    {
      tag_name: 'v2.0.0', name: 'v2.0.0', draft: true,
      published_at: '2026-05-01T00:00:00Z', body: '',
      assets: [{ name: 'DraftApp-2.0.0-mac.dmg', browser_download_url: 'https://example.com/2.dmg' }]
    },
    {
      tag_name: 'v1.0.0', name: 'v1.0.0', draft: false,
      published_at: '2026-01-01T00:00:00Z', body: '',
      assets: [{ name: 'DraftApp-1.0.0-mac.dmg', browser_download_url: 'https://example.com/1.dmg' }]
    }
  ]));
  const project = {
    name: 'DraftApp', repoName: 'DraftApp', repoUrl: 'https://github.com/touktw/DraftApp', license: 'x',
    platforms: [{ label: 'macOS', assetPattern: '\\.dmg$|mac' }]
  };
  const html = await buildProject(project, { mockDir: dir });
  assert.doesNotMatch(html, /v2\.0\.0/);
  assert.doesNotMatch(html, /DraftApp-2\.0\.0-mac\.dmg/);
  assert.match(html, /class="badge">최신 버전/);
  assert.match(html, /DraftApp-1\.0\.0-mac\.dmg/);
});

test('buildProject renders the "no releases yet" empty state when the mock file has no qualifying releases', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-pages-empty-'));
  fs.writeFileSync(path.join(dir, 'EmptyApp.json'), '[]');
  const project = {
    name: 'EmptyApp', repoName: 'EmptyApp', repoUrl: 'https://github.com/touktw/EmptyApp', license: 'x',
    platforms: [{ label: 'macOS', assetPattern: '\\.dmg$|mac' }]
  };
  const html = await buildProject(project, { mockDir: dir });
  assert.match(html, /아직 macOS 릴리스가 없습니다/);
  assert.doesNotMatch(html, /class="badge">최신 버전/);
});

test('buildProject fails loudly with a clear message when a data.js entry is malformed', async () => {
  const project = { name: '잘못된 프로젝트', repoUrl: 'https://github.com/touktw/Broken' };
  await assert.rejects(
    () => buildProject(project, { mockDir: FIXTURES_DIR }),
    /data\.js 프로젝트 항목 오류 \(잘못된 프로젝트\)/
  );
});

test('buildProject degrades to "no releases" instead of throwing when the mock JSON is not an array', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-pages-nonarray-'));
  fs.writeFileSync(path.join(dir, 'WeirdApp.json'), JSON.stringify({ message: "Not Found" }));
  const project = {
    name: 'WeirdApp', repoName: 'WeirdApp', repoUrl: 'https://github.com/touktw/WeirdApp', license: 'x',
    platforms: [{ label: 'macOS', assetPattern: '\\.dmg$|mac' }]
  };
  const html = await buildProject(project, { mockDir: dir });
  assert.match(html, /아직 macOS 릴리스가 없습니다/);
});

const { parseArgs } = require('./build-download-pages');

test('parseArgs reads --out and --mock-dir', () => {
  const args = parseArgs(['--out=_site/projects', '--mock-dir=fixtures/releases']);
  assert.equal(args.out, '_site/projects');
  assert.equal(args.mockDir, 'fixtures/releases');
});

test('parseArgs defaults out to _site/projects and mockDir to null', () => {
  const args = parseArgs([]);
  assert.equal(args.out, '_site/projects');
  assert.equal(args.mockDir, null);
});
