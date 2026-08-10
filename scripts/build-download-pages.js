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

module.exports = { escapeHtml, renderNotes, matchAsset, selectPlatformReleases };
