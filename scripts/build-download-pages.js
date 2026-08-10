#!/usr/bin/env node
'use strict';

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

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

function renderLatestRelease({ release, asset }) {
  return `<span class="badge">최신 버전</span>
<h3 style="margin: 8px 0 0;">${escapeHtml(release.name || release.tag_name)}</h3>
<div class="meta">${formatDate(release.published_at)}</div>
<div class="notes">${renderNotes(release.body)}</div>
<a class="dl-link" href="${asset.browser_download_url}">⬇ ${escapeHtml(asset.name)} 다운로드</a>`;
}

function renderOlderReleases(matches) {
  const items = matches.map(({ release, asset }) => `
<details class="release-item">
<summary><span>${escapeHtml(release.name || release.tag_name)}</span><span class="date">${formatDate(release.published_at)}</span></summary>
<div class="body">
<div class="notes">${renderNotes(release.body)}</div>
<a class="dl-link" href="${asset.browser_download_url}">⬇ ${escapeHtml(asset.name)} 다운로드</a>
</div>
</details>`).join("");
  return `<details class="older"><summary>이전 버전 보기</summary><div>${items}</div></details>`;
}

function renderPlatformCard(project, platform, state) {
  const header = `<div class="platform-header"><h2>${escapeHtml(platform.label)}</h2>${platform.tbd ? '<span class="tbd-badge">TBD</span>' : ''}</div>`;

  if (platform.tbd) {
    return `<div class="platform-card">${header}<p class="status">${escapeHtml(platform.label)} 버전은 아직 준비 중입니다. 진행 상황은 <a href="${project.repoUrl}">GitHub 저장소</a>에서 확인해 주세요.</p></div>`;
  }
  if (state.apiError) {
    return `<div class="platform-card">${header}<p class="status">릴리스 목록을 불러오지 못했습니다. GitHub Releases 페이지에서 직접 확인해 주세요: <a href="${project.repoUrl}/releases">${escapeHtml(project.repoUrl.replace('https://', ''))}/releases</a></p></div>`;
  }
  const matches = state.matches || [];
  if (matches.length === 0) {
    return `<div class="platform-card">${header}<p class="status">아직 ${escapeHtml(platform.label)} 릴리스가 없습니다. 진행 상황은 <a href="${project.repoUrl}">GitHub 저장소</a>에서 확인해 주세요.</p></div>`;
  }
  const [latest, ...older] = matches;
  const latestHtml = renderLatestRelease(latest);
  const olderHtml = older.length ? renderOlderReleases(older) : '';
  return `<div class="platform-card">${header}${latestHtml}${olderHtml}</div>`;
}

module.exports = { escapeHtml, renderNotes, matchAsset, selectPlatformReleases, formatDate, renderPlatformCard };
