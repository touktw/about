#!/usr/bin/env node
'use strict';

const fs = require("fs");
const path = require("path");

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 이 프로젝트들의 release body에서 쓰는 마크다운 부분집합(##/### 헤더, "- " 리스트,
// **bold**, `code`, 링크)만 지원하는 최소 렌더러.
function renderNotes(md) {
  const lines = escapeHtml(md || "").split("\n");
  let html = "";
  let inList = false;

  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (m, text, url) =>
      /^https?:\/\//i.test(url)
        ? `<a href="${url.replace(/"/g, "&quot;")}" target="_blank" rel="noopener">${text}</a>`
        : m
    );

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") { closeList(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      html += `<h3>${inline(heading[2])}</h3>`;
      continue;
    }
    const item = line.match(/^[-*]\s+(.*)$/);
    if (item) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(item[1])}</li>`;
      continue;
    }
    closeList();
    html += `<p>${inline(line)}</p>`;
  }
  closeList();
  return html;
}

function matchAsset(release, re) {
  return (release.assets || []).find((a) => re.test(a.name));
}

function selectPlatformReleases(releases, platform) {
  const re = new RegExp(platform.assetPattern, "i");
  return releases
    .map((release) => ({ release, asset: matchAsset(release, re) }))
    .filter((m) => m.asset);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function renderDownloadLink(asset) {
  return `<a class="dl-link" href="${escapeHtml(asset.browser_download_url)}">⬇ ${escapeHtml(asset.name)} 다운로드</a>`;
}

function renderLatestRelease({ release, asset }) {
  return `<span class="badge">최신 버전</span>
<h3>${escapeHtml(release.name || release.tag_name)}</h3>
<div class="meta">${formatDate(release.published_at)}</div>
<div class="notes">${renderNotes(release.body)}</div>
${renderDownloadLink(asset)}`;
}

function renderOlderReleases(matches) {
  const items = matches.map(({ release, asset }) => `
<details class="release-item">
<summary><span>${escapeHtml(release.name || release.tag_name)}</span><span class="date">${formatDate(release.published_at)}</span></summary>
<div class="body">
<div class="notes">${renderNotes(release.body)}</div>
${renderDownloadLink(asset)}
</div>
</details>`).join("");
  return `<details class="older"><summary>이전 버전 보기</summary><div>${items}</div></details>`;
}

function renderPlatformCard(project, platform, state) {
  const header = `<div class="platform-header"><h2>${escapeHtml(platform.label)}</h2>${platform.tbd ? '<span class="tbd-badge">TBD</span>' : ''}</div>`;

  if (platform.tbd) {
    return `<div class="platform-card">${header}<p class="status">${escapeHtml(platform.label)} 버전은 아직 준비 중입니다. 진행 상황은 <a href="${escapeHtml(project.repoUrl)}">GitHub 저장소</a>에서 확인해 주세요.</p></div>`;
  }
  if (state.apiError) {
    return `<div class="platform-card">${header}<p class="status">릴리스 목록을 불러오지 못했습니다. GitHub Releases 페이지에서 직접 확인해 주세요: <a href="${escapeHtml(project.repoUrl)}/releases">${escapeHtml(project.repoUrl.replace('https://', ''))}/releases</a></p></div>`;
  }
  const matches = state.matches || [];
  if (matches.length === 0) {
    return `<div class="platform-card">${header}<p class="status">아직 ${escapeHtml(platform.label)} 릴리스가 없습니다. 진행 상황은 <a href="${escapeHtml(project.repoUrl)}">GitHub 저장소</a>에서 확인해 주세요.</p></div>`;
  }
  const [latest, ...older] = matches;
  const latestHtml = renderLatestRelease(latest);
  const olderHtml = older.length ? renderOlderReleases(older) : '';
  return `<div class="platform-card">${header}${latestHtml}${olderHtml}</div>`;
}

function renderProjectPage(project, platformCardsHtml) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<link rel="stylesheet" href="/themes.css">
<link rel="stylesheet" href="/style.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<title>다운로드 · ${escapeHtml(project.name)}</title>
</head>
<body>
<div class="page">
<nav class="panel nav-panel" id="nav-root"></nav>
<header class="panel">
<h1>${escapeHtml(project.name)}</h1>
<p class="lead">${escapeHtml(project.tagline || "")}</p>
<p><a href="${escapeHtml(project.repoUrl)}" rel="noopener noreferrer">${escapeHtml(project.repoUrl.replace("https://", ""))}</a></p>
</header>
<section class="panel platform-grid">
${platformCardsHtml}
</section>
<footer class="panel">
<p class="app-license">${escapeHtml(project.license || "")}</p>
</footer>
</div>
<script src="/nav.js"></script>
</body>
</html>
`;
}

function loadMockReleases(mockDir, repoName) {
  const file = path.join(mockDir, `${repoName}.json`);
  if (!fs.existsSync(file)) throw new Error(`mock file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

async function fetchReleases(repoName, token) {
  const res = await fetch(`https://api.github.com/repos/touktw/${repoName}/releases?per_page=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "about-build-download-pages"
    }
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

function parseArgs(argv) {
  const args = { out: "_site/projects", mockDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--out=")) args.out = arg.slice("--out=".length);
    else if (arg.startsWith("--mock-dir=")) args.mockDir = arg.slice("--mock-dir=".length);
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const SITE_DATA = require(path.join(__dirname, "..", "data.js"));
  const token = process.env.GITHUB_TOKEN;

  for (const project of SITE_DATA.projects) {
    const html = await buildProject(project, { token, mockDir: args.mockDir });
    const dir = path.join(args.out, project.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
    console.log(`built ${project.slug}/index.html`);
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

async function buildProject(project, opts) {
  if (!project.repoName || !Array.isArray(project.platforms)) {
    throw new Error(`data.js 프로젝트 항목 오류 (${project.name || "이름 없음"}): repoName과 platforms(배열)가 필요합니다`);
  }

  let releases;
  let apiError = false;
  try {
    releases = opts.mockDir
      ? loadMockReleases(opts.mockDir, project.repoName)
      : await fetchReleases(project.repoName, opts.token);
  } catch (err) {
    console.warn(`::warning::${project.repoName} 릴리스 조회 실패: ${err.message}`);
    apiError = true;
    releases = [];
  }

  const list = Array.isArray(releases) ? releases : [];
  const sorted = list
    .filter((r) => !r.draft)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  const cardsHtml = project.platforms.map((platform) => {
    if (platform.tbd) return renderPlatformCard(project, platform, {});
    if (apiError) return renderPlatformCard(project, platform, { apiError: true });
    return renderPlatformCard(project, platform, { matches: selectPlatformReleases(sorted, platform) });
  }).join("\n");

  return renderProjectPage(project, cardsHtml);
}

module.exports = {
  escapeHtml, renderNotes, matchAsset, selectPlatformReleases,
  formatDate, renderPlatformCard, renderProjectPage, buildProject,
  loadMockReleases, fetchReleases, parseArgs
};
