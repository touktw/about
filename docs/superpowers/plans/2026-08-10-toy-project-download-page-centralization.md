# toy project 다운로드 페이지 중앙화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `about` 레포가 `data.js`에 등록된 각 toy project의 GitHub Releases를 직접 읽어
정적 다운로드 페이지(`projects/{slug}/index.html`)를 빌드 시점에 생성하도록 바꾼다. 새
프로젝트를 추가할 때 `data.js`의 `projects` 배열에 항목 하나만 추가하면 되는 것이 최종
목표다.

**Architecture:** GitHub Actions 빌드 스텝에서 Node 스크립트(`scripts/build-download-pages.js`)가
`data.js`(CommonJS로도 `require` 가능하게 확장)를 읽어 프로젝트별 GitHub Releases API를
호출하고, asset 파일명 패턴으로 플랫폼을 매칭해 완전 정적 HTML을 만든다. 다른 레포에서
released 이벤트가 about 재배포를 즉시 트리거할 수 있도록 `repository_dispatch` 트리거와
`scripts/notify-redeploy.js`를 추가한다.

**Tech Stack:** Vanilla JS(about 기존 사이트), Node 18+ 내장 `fetch`/`node:test`(신규
npm 의존성 없음), GitHub Actions.

**참고 설계 문서:** `docs/superpowers/specs/2026-08-10-toy-project-download-page-centralization-design.md`

## Global Constraints

- Node 18+ 내장 `fetch`만 사용한다. 신규 npm 의존성이나 `package.json`을 추가하지 않는다
  (about은 순수 정적 사이트 상태를 유지한다).
- 신규 스크립트는 CommonJS(`require`/`module.exports`)로 작성한다. `.mjs`/ESM을 쓰지 않는다.
- 대상 GitHub 계정/오너는 `touktw`로 고정한다.
- 생성되는 다운로드 페이지는 완전 정적(bake-only)이다 — 클라이언트 측에서 GitHub API를
  다시 호출하거나 `localStorage`에 캐싱하는 코드를 넣지 않는다.
- 이번 작업 범위는 `about` 레포 내부로 한정한다. AndroidDeveloper/AdbTool 등 다른 레포의
  `docs/site`/자체 `pages.yml` 변경은 범위 밖이다(이미 다른 세션에서 진행 중).
- 커밋 메시지는 한글로만 작성한다. `Co-Authored-By: Claude` 등 author/co-author에 Claude를
  추가하지 않는다.

---

## File Structure Overview

- `data.js` — 수정: `projects[]` 스키마를 `repoName`/`platforms[{label,assetPattern,tbd?}]`
  기반으로 바꾸고, 파일 하단에 `slug`/`repoUrl`/`downloadUrl` 파생 블록 + `module.exports` 추가.
- `render.js` — 수정: `renderAppProject`가 새 `platforms` 객체 배열 shape을 읽도록.
- `nav.js` — 수정: `/projects/{slug}/` 하위 경로도 "toys" 탭 active로 인식, nav 링크를
  루트 기준 절대경로로.
- `style.css` — 수정: 다운로드 페이지 전용 클래스(`.platform-grid`, `.platform-card` 등) 추가.
- `scripts/build-download-pages.js` — 신규: 다운로드 페이지 생성기(순수 함수 + CLI).
- `scripts/build-download-pages.test.js` — 신규: 위 스크립트의 `node:test` 유닛 테스트.
- `scripts/notify-redeploy.js` — 신규: 다른 레포가 참조해 about 재배포를 트리거하는 스크립트.
- `scripts/notify-redeploy.test.js` — 신규: 위 스크립트 유닛 테스트.
- `fixtures/releases/AdbTool.json`, `fixtures/releases/AndroidDeveloper.json` — 신규:
  로컬 미리보기용 목업 GitHub Releases 응답.
- `.gitignore` — 신규: `/projects/`, `/_site/` 제외.
- `.github/workflows/pages.yml` — 수정: mirror curl 스텝 제거, 빌드 스텝/트리거 추가.

---

### Task 1: `data.js` 스키마를 `repoName` 기반으로 바꾸고 Node에서 읽을 수 있게 만들기

**Files:**
- Modify: `data.js:165-208` (기존 `projects` 배열), 파일 끝(현재 224번째 줄 `};` 뒤)

**Interfaces:**
- Produces: `require('./data.js')`가 `SITE_DATA` 객체를 반환하며, 각 `SITE_DATA.projects[i]`는
  `{ name, tagline, description, features, repoName, platforms: [{label, assetPattern, tbd?}],
  license, slug, repoUrl, downloadUrl }` shape (뒤 3개는 파생 필드).

- [ ] **Step 1: `projects` 배열을 새 스키마로 교체**

`data.js`의 165~208번째 줄(`projects: [ ... ],` 전체)을 아래로 교체한다:

```js
  projects: [
    {
      name: "Android Developer",
      tagline: "안드로이드 개발자를 위한 온디바이스 개발자 툴박스 앱",
      description: "기기·앱 정보 조회, 개발자 옵션 관리, 실시간 로그캣 뷰어, 딥링크/인텐트 테스터, Gradle 의존성 검색 등을 폰 안에서 바로 쓸 수 있는 개발자 도구 앱입니다.",
      repoName: "AndroidDeveloper",
      platforms: [
        { label: "Android", assetPattern: "\\.apk$" }
      ],
      features: [
        "기기/앱 정보 조회",
        "개발자 옵션 및 디버깅 설정 관리",
        "실시간 로그캣 뷰어",
        "딥링크 / 인텐트 테스터",
        "Gradle 의존성 검색",
        "Quick Launch",
        "QR 코드 생성 및 스캔",
        "라이트 / 다크 / 시스템 테마 지원"
      ],
      license: "Apache License 2.0"
    },
    {
      name: "ADB tools for desktop",
      tagline: "데스크탑용 ADB 툴",
      description: "데스크탑에서 ADB 명령어를 쉽게 실행 가능하게 합니다.",
      repoName: "AdbTool",
      platforms: [
        { label: "macOS", assetPattern: "\\.(dmg|pkg)$|mac" },
        { label: "Windows", assetPattern: "\\.(exe|msi|zip)$|win", tbd: true }
      ],
      features: [
        "연결된 디바이스 확인",
        "APK 설치",
        "Deeplink 발송",
        "권한 부여/회수",
        "dumpsys 뷰어",
        "Logcat 뷰어",
        "파일 탐색기",
        "화면 캡쳐/녹화"
      ],
      license: "Apache License 2.0"
    }
  ],
```

- [ ] **Step 2: 파생 필드 블록 + `module.exports` 추가**

파일 맨 끝(`};`로 `SITE_DATA` 객체 리터럴이 끝나는 줄) 바로 뒤에 추가:

```js

SITE_DATA.projects = SITE_DATA.projects.map(function (p) {
  var slug = p.repoName.toLowerCase();
  return Object.assign({}, p, {
    slug: slug,
    repoUrl: "https://github.com/touktw/" + p.repoName,
    downloadUrl: "projects/" + slug + "/"
  });
});

if (typeof module !== "undefined") {
  module.exports = SITE_DATA;
}
```

- [ ] **Step 3: 파생 결과 확인**

Run:
```bash
node -e "const d = require('./data.js'); console.log(JSON.stringify(d.projects.map(function(p){return {name:p.name, slug:p.slug, repoUrl:p.repoUrl, downloadUrl:p.downloadUrl};}), null, 2));"
```

Expected:
```json
[
  {
    "name": "Android Developer",
    "slug": "androiddeveloper",
    "repoUrl": "https://github.com/touktw/AndroidDeveloper",
    "downloadUrl": "projects/androiddeveloper/"
  },
  {
    "name": "ADB tools for desktop",
    "slug": "adbtool",
    "repoUrl": "https://github.com/touktw/AdbTool",
    "downloadUrl": "projects/adbtool/"
  }
]
```

- [ ] **Step 4: Commit**

```bash
git add data.js
git commit -m "data.js: 프로젝트 등록 스키마를 repoName 기반으로 변경

slug/repoUrl/downloadUrl을 repoName에서 자동 파생시켜 새 프로젝트 등록 시
data.js 한 곳만 수정하면 되도록 함. Node에서 require 가능하도록
module.exports 추가."
```

---

### Task 2: `render.js`/`nav.js`를 새 `platforms` shape과 다운로드 페이지 경로에 맞게 수정

**Files:**
- Modify: `render.js:64-68`
- Modify: `nav.js` 전체

**Interfaces:**
- Consumes: Task 1의 `SITE_DATA.projects[].platforms[].label` (문자열), `.slug`.
- Produces: 없음(리프 UI 변경).

- [ ] **Step 1: `render.js`의 platforms 렌더링을 객체 배열에 맞게 수정**

`render.js:64-68`을 다음으로 교체:

```js
  if (p.platforms && p.platforms.length) {
    html += '<ul class="chips platforms">' +
      p.platforms.map(function (pf) { return '<li>' + pf.label + '</li>'; }).join('') +
      '</ul>';
  }
```

(`pf` → `pf.label` 한 곳만 변경)

- [ ] **Step 2: `nav.js`를 루트 기준 절대경로 + `/projects/` active 인식으로 수정**

`nav.js` 전체를 다음으로 교체 (기존과의 차이: `NAV_ITEMS.href`가 루트 기준 절대경로가 되고,
`currentPage()`가 `/projects/{slug}/` 하위 경로도 `"projects"`로 인식):

```js
(function () {
  var NAV_ITEMS = [
    { key: "home", label: "home", href: "/index.html" },
    { key: "me", label: "me", href: "/me.html" },
    { key: "projects", label: "toys", href: "/projects.html" }
  ];

  function currentPage() {
    if (location.pathname.indexOf("/projects/") !== -1) return "projects";
    var path = location.pathname.split("/").pop();
    if (path === "" || path === "index.html") return "home";
    if (path === "me.html") return "me";
    if (path === "projects.html") return "projects";
    return "";
  }

  function renderNav() {
    var active = currentPage();
    return NAV_ITEMS.map(function (item) {
      return item.key === active
        ? '<span class="active">' + item.label + '</span>'
        : '<a href="' + item.href + '">' + item.label + '</a>';
    }).join(' · ');
  }

  var root = document.getElementById('nav-root');
  if (root) root.innerHTML = renderNav();
})();
```

(주의: `about`은 커스텀 도메인 `teo.kim` 루트에 배포되므로(`CNAME` 파일 확인됨) 절대경로
`/index.html` 등이 어느 깊이의 페이지에서도 올바르게 동작한다. `/projects/{slug}/` 형태의
2단계 깊이 페이지는 상대경로 `"index.html"`로는 nav 링크가 깨지기 때문에 이 변경이 필요하다.)

- [ ] **Step 3: 수동 확인**

```bash
python3 -m http.server 8000 &
```
브라우저로 `http://localhost:8000/projects.html` 접속 → 각 앱 카드의 플랫폼 chip이
`Android`/`macOS`/`Windows` 텍스트로(`[object Object]`가 아니라) 보이는지, "다운로드" 버튼이
`projects/androiddeveloper/`, `projects/adbtool/`로 링크되는지 확인. `http://localhost:8000/index.html`,
`/me.html`, `/projects.html`에서 nav의 active 탭이 정상 표시되는지도 확인. 확인 후:

```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add render.js nav.js
git commit -m "render.js/nav.js: platforms 객체 shape 및 다운로드 페이지 경로 대응

data.js의 platforms가 문자열 배열에서 {label, assetPattern} 객체 배열로
바뀐 것에 맞춰 render.js를 수정. nav.js는 /projects/{slug}/ 하위 페이지도
toys 탭으로 인식하고, 링크를 루트 기준 절대경로로 바꿔 다운로드 페이지
깊이에서도 nav가 깨지지 않게 함."
```

---

### Task 3: `style.css`에 다운로드 페이지 전용 클래스 추가

**Files:**
- Modify: `style.css` (파일 끝에 추가)

**Interfaces:**
- Produces: `.platform-grid`, `.platform-card`, `.platform-header`, `.badge`, `.tbd-badge`,
  `.meta`, `.notes`(+ 자손 선택자), `.older`(+ 자손), `details.release-item`(+ 자손),
  `.dl-link`, `.status` 클래스. Task 6의 `renderPlatformCard`가 이 클래스명들을 그대로 사용.

- [ ] **Step 1: CSS 추가**

`style.css` 맨 끝에 추가 (기존 `themes.css`의 `--bg`/`--surface`/`--border`/`--text`/
`--text-dim`/`--accent`/`--accent-text`/`--code-bg`/`--shadow` 변수를 그대로 재사용):

```css

/* 프로젝트 다운로드 페이지 전용 (scripts/build-download-pages.js가 생성하는 HTML용) */

.platform-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.platform-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px 24px;
  box-shadow: var(--shadow);
}

.platform-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.platform-header h2 {
  margin: 0;
  font-size: 1.2rem;
  text-transform: none;
  letter-spacing: normal;
  color: var(--text);
}

.badge {
  display: inline-block;
  background: var(--accent);
  color: var(--accent-text);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}

.tbd-badge {
  display: inline-block;
  background: var(--code-bg);
  color: var(--text-dim);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}

.meta {
  color: var(--text-dim);
  font-size: 0.88rem;
  margin: 8px 0 16px;
}

.notes {
  font-size: 0.94rem;
  color: var(--text);
}
.notes h1, .notes h2, .notes h3 {
  font-size: 1rem;
  margin: 18px 0 6px;
}
.notes ul { padding-left: 20px; }
.notes li { margin: 3px 0; }
.notes code {
  background: var(--code-bg);
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 0.88em;
}
.notes a { color: var(--accent); }

.older {
  margin-top: 20px;
}
.older > summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--text-dim);
  padding: 8px 0;
  list-style: none;
}
.older > summary::-webkit-details-marker { display: none; }
.older > summary::before { content: "▸ "; }
.older[open] > summary::before { content: "▾ "; }

details.release-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-top: 10px;
  background: var(--surface);
  overflow: hidden;
}
details.release-item summary {
  cursor: pointer;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  list-style: none;
  font-weight: 600;
}
details.release-item summary::-webkit-details-marker { display: none; }
details.release-item summary .date {
  font-weight: 400;
  color: var(--text-dim);
  font-size: 0.85rem;
}
details.release-item .body {
  padding: 4px 18px 18px;
  border-top: 1px solid var(--border);
}

.dl-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--accent);
  color: var(--accent-text);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.88rem;
}

.status {
  color: var(--text-dim);
  font-size: 0.92rem;
  margin-top: 12px;
}
.status a { color: var(--accent); }
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "style.css: 프로젝트 다운로드 페이지용 클래스 추가

AdbTool/AndroidDeveloper가 각자 쓰던 platform-card 계열 스타일을
about 공용 스타일로 흡수. themes.css의 기존 색상 변수를 그대로 재사용."
```

---

### Task 4: `scripts/build-download-pages.js` — `escapeHtml`/`renderNotes` (릴리스 노트 렌더러)

**Files:**
- Create: `scripts/build-download-pages.js`
- Create: `scripts/build-download-pages.test.js`

**Interfaces:**
- Produces: `escapeHtml(s: string): string`, `renderNotes(md: string): string`. 순수 문자열
  함수, DOM/네트워크 의존 없음. 이후 Task들이 `module.exports`에 계속 추가한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/build-download-pages.test.js` 생성:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: FAIL — `Cannot find module './build-download-pages'`

- [ ] **Step 3: 최소 구현 작성**

`scripts/build-download-pages.js` 생성 (AdbTool `download.html`의 `escapeHtml`/`renderNotes`를
그대로 포팅 — 순수 문자열 처리라 브라우저 의존 없이 동작):

```js
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

module.exports = { escapeHtml, renderNotes };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/build-download-pages.js scripts/build-download-pages.test.js
git commit -m "scripts: 릴리스 노트 미니 마크다운 렌더러 추가

AdbTool/AndroidDeveloper download.html에서 쓰던 escapeHtml/renderNotes를
Node용 build-download-pages.js로 포팅 (순수 문자열 처리라 변경 없이 재사용 가능)."
```

---

### Task 5: `matchAsset`/`selectPlatformReleases` (플랫폼별 asset 매칭)

**Files:**
- Modify: `scripts/build-download-pages.js`
- Modify: `scripts/build-download-pages.test.js`

**Interfaces:**
- Consumes: 없음 (Task 4 함수와 독립).
- Produces: `matchAsset(release: {assets: {name,browser_download_url}[]}, re: RegExp): asset|undefined`,
  `selectPlatformReleases(releases: Release[], platform: {label, assetPattern}): {release, asset}[]`
  (release는 이미 `published_at` 내림차순 정렬되어 들어온다고 가정, non-draft 필터링도 호출자
  책임).

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/build-download-pages.test.js`에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: FAIL — `matchAsset is not a function`

- [ ] **Step 3: 구현 작성**

`scripts/build-download-pages.js`의 `module.exports` 윗줄에 추가:

```js
function matchAsset(release, re) {
  return (release.assets || []).find((a) => re.test(a.name));
}

function selectPlatformReleases(releases, platform) {
  const re = new RegExp(platform.assetPattern, "i");
  return releases
    .map((release) => ({ release, asset: matchAsset(release, re) }))
    .filter((m) => m.asset);
}
```

`module.exports`를 다음으로 갱신:

```js
module.exports = { escapeHtml, renderNotes, matchAsset, selectPlatformReleases };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/build-download-pages.js scripts/build-download-pages.test.js
git commit -m "scripts: 플랫폼별 release asset 매칭 로직 추가"
```

---

### Task 6: `renderPlatformCard` (플랫폼 카드 HTML)

**Files:**
- Modify: `scripts/build-download-pages.js`
- Modify: `scripts/build-download-pages.test.js`

**Interfaces:**
- Consumes: Task 4 `escapeHtml`/`renderNotes`, Task 3의 CSS 클래스명(`.platform-card` 등).
- Produces: `formatDate(iso: string): string`,
  `renderPlatformCard(project: {repoUrl}, platform: {label, tbd?}, state: {apiError?, matches?}): string`.
  `state.matches`는 Task 5의 `selectPlatformReleases` 반환값(`{release, asset}[]`)과 동일 shape.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/build-download-pages.test.js`에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: FAIL — `renderPlatformCard is not a function`

- [ ] **Step 3: 구현 작성**

`scripts/build-download-pages.js`에 추가:

```js
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
```

`module.exports`를 갱신:

```js
module.exports = {
  escapeHtml, renderNotes, matchAsset, selectPlatformReleases,
  formatDate, renderPlatformCard
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/build-download-pages.js scripts/build-download-pages.test.js
git commit -m "scripts: 플랫폼 카드 HTML 렌더러 추가 (tbd/apiError/empty/정상 케이스)"
```

---

### Task 7: `renderProjectPage`/`buildProject` (페이지 조립 + 릴리스 조회 오케스트레이션)

**Files:**
- Modify: `scripts/build-download-pages.js`
- Modify: `scripts/build-download-pages.test.js`

**Interfaces:**
- Consumes: Task 6 `renderPlatformCard`, Task 5 `selectPlatformReleases`.
- Produces: `renderProjectPage(project: {name,tagline,repoUrl,license}, platformCardsHtml: string): string`,
  `async buildProject(project, opts: {token?, mockDir?}): Promise<string>` (opts 중 정확히
  하나만 의미 있음 — `mockDir`이 있으면 `loadMockReleases`, 없으면 `fetchReleases(token)`을
  쓴다. 이 Task에서는 아직 `fetchReleases`/`loadMockReleases`가 없으므로 테스트는 `mockDir`이
  가리키는 파일이 없을 때(=API 실패 시뮬레이션)의 폴백 경로만 검증한다. 실제 fetch/mock
  구현은 Task 8에서 추가된다 — 이 Task에서는 `buildProject` 내부에서 두 함수를 `require`
  시점에 아직 정의되지 않은 상태로 참조해도 되도록, 같은 파일 안에서 나중에 정의될
  함수 이름을 그대로 호출하게 작성한다(Task 8에서 실제로 정의됨. 이 Task의 테스트는
  `mockDir`에 존재하지 않는 디렉터리를 넘겨 `loadMockReleases`가 throw하는 경로만 쓰므로
  `loadMockReleases`의 최소 스텁을 이 Task에서 먼저 추가한다).

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/build-download-pages.test.js`에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: FAIL — `renderProjectPage is not a function`

- [ ] **Step 3: 구현 작성**

`scripts/build-download-pages.js`에 추가 (파일 상단에 `fs`/`path` require 추가):

```js
const fs = require("fs");
const path = require("path");
```

`module.exports` 윗줄에 추가:

```js
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
<p><a href="${project.repoUrl}" rel="noopener noreferrer">${escapeHtml(project.repoUrl.replace("https://", ""))}</a></p>
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

// 이 함수는 Task 8에서 정의된다. Task 7 시점에는 아래 buildProject가 참조만 하고,
// mockDir 파일이 없을 때 throw하는 경로로만 테스트된다.
function loadMockReleases(mockDir, repoName) {
  const file = path.join(mockDir, `${repoName}.json`);
  if (!fs.existsSync(file)) throw new Error(`mock file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

async function buildProject(project, opts) {
  let releases;
  let apiError = false;
  try {
    releases = opts.mockDir
      ? loadMockReleases(opts.mockDir, project.repoName)
      : await fetchReleases(project.repoName, opts.token);
  } catch (err) {
    console.warn(`[build-download-pages] ${project.repoName} 릴리스 조회 실패: ${err.message}`);
    apiError = true;
    releases = [];
  }

  const sorted = releases
    .filter((r) => !r.draft)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  const cardsHtml = project.platforms.map((platform) => {
    if (platform.tbd) return renderPlatformCard(project, platform, {});
    if (apiError) return renderPlatformCard(project, platform, { apiError: true });
    return renderPlatformCard(project, platform, { matches: selectPlatformReleases(sorted, platform) });
  }).join("\n");

  return renderProjectPage(project, cardsHtml);
}
```

`module.exports`를 갱신:

```js
module.exports = {
  escapeHtml, renderNotes, matchAsset, selectPlatformReleases,
  formatDate, renderPlatformCard, renderProjectPage, buildProject,
  loadMockReleases
};
```

(`fetchReleases`는 아직 정의되지 않았지만 `opts.mockDir`이 항상 설정된 이 Task의 테스트
경로에서는 호출되지 않는다. Task 8에서 정의한다.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/build-download-pages.js scripts/build-download-pages.test.js
git commit -m "scripts: 프로젝트 페이지 템플릿과 buildProject 오케스트레이션 추가"
```

---

### Task 8: CLI 진입점(`fetchReleases`/`main`) + 목업 fixtures + 로컬 미리보기

**Files:**
- Modify: `scripts/build-download-pages.js`
- Modify: `scripts/build-download-pages.test.js`
- Create: `fixtures/releases/AdbTool.json`
- Create: `fixtures/releases/AndroidDeveloper.json`
- Create: `.gitignore`

**Interfaces:**
- Consumes: Task 1 `require('../data.js')` (`SITE_DATA.projects`), Task 7 `buildProject`.
- Produces: `parseArgs(argv: string[]): {out: string, mockDir: string|null}`,
  `async fetchReleases(repoName: string, token: string): Promise<Release[]>`, CLI 실행
  (`node scripts/build-download-pages.js [--out=...] [--mock-dir=...]`).

- [ ] **Step 1: 실패하는 테스트 작성 (parseArgs)**

`scripts/build-download-pages.test.js`에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: FAIL — `parseArgs is not a function`

- [ ] **Step 3: `fetchReleases`/`parseArgs`/`main` 구현**

`scripts/build-download-pages.js`에 추가 (`loadMockReleases` 정의 바로 아래):

```js
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
```

`module.exports`를 갱신 (CLI 실행 블록 `if (require.main === module)`보다 위, 즉 파일 맨
아래 export 문에 반영):

```js
module.exports = {
  escapeHtml, renderNotes, matchAsset, selectPlatformReleases,
  formatDate, renderPlatformCard, renderProjectPage, buildProject,
  loadMockReleases, fetchReleases, parseArgs
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/build-download-pages.test.js`
Expected: PASS (14 tests)

- [ ] **Step 5: 목업 fixtures 작성**

`fixtures/releases/AdbTool.json` 생성 (macOS 자산이 있는 릴리스 2개 + macOS 자산이 없는
릴리스 1개로 "매칭 asset 없는 release는 제외" 케이스 포함):

```json
[
  {
    "tag_name": "v1.1.0",
    "name": "v1.1.0",
    "draft": false,
    "published_at": "2026-03-01T09:00:00Z",
    "body": "## v1.1.0\n- 파일 탐색기 이미지 미리보기 추가\n- 업데이트 체크 캐시 개선",
    "assets": [
      { "name": "AdbTool-1.1.0-mac.dmg", "browser_download_url": "https://github.com/touktw/AdbTool/releases/download/v1.1.0/AdbTool-1.1.0-mac.dmg" }
    ]
  },
  {
    "tag_name": "v1.0.1",
    "name": "v1.0.1",
    "draft": false,
    "published_at": "2026-02-01T09:00:00Z",
    "body": "- 버그 수정",
    "assets": [
      { "name": "AdbTool-1.0.1-mac.dmg", "browser_download_url": "https://github.com/touktw/AdbTool/releases/download/v1.0.1/AdbTool-1.0.1-mac.dmg" }
    ]
  },
  {
    "tag_name": "v0.9.0",
    "name": "v0.9.0 Windows Preview",
    "draft": false,
    "published_at": "2026-01-01T09:00:00Z",
    "body": "Windows 미리보기 (macOS 자산 없음 — mac 목록에서 제외되어야 함)",
    "assets": [
      { "name": "AdbTool-0.9.0-win.exe", "browser_download_url": "https://github.com/touktw/AdbTool/releases/download/v0.9.0/AdbTool-0.9.0-win.exe" }
    ]
  }
]
```

`fixtures/releases/AndroidDeveloper.json` 생성:

```json
[
  {
    "tag_name": "v2.3.0",
    "name": "v2.3.0",
    "draft": false,
    "published_at": "2026-03-05T09:00:00Z",
    "body": "## v2.3.0\n- Gradle 의존성 검색 추가",
    "assets": [
      { "name": "AndroidDeveloper-2.3.0.apk", "browser_download_url": "https://github.com/touktw/AndroidDeveloper/releases/download/v2.3.0/AndroidDeveloper-2.3.0.apk" }
    ]
  },
  {
    "tag_name": "v2.2.0",
    "name": "v2.2.0",
    "draft": false,
    "published_at": "2026-02-10T09:00:00Z",
    "body": "- 딥링크 테스터 추가",
    "assets": [
      { "name": "AndroidDeveloper-2.2.0.apk", "browser_download_url": "https://github.com/touktw/AndroidDeveloper/releases/download/v2.2.0/AndroidDeveloper-2.2.0.apk" }
    ]
  }
]
```

- [ ] **Step 6: `.gitignore` 작성**

`.gitignore` 생성:

```
/_site/
/projects/
```

- [ ] **Step 7: 로컬 미리보기로 수동 확인**

```bash
node scripts/build-download-pages.js --mock-dir=fixtures/releases --out=projects
python3 -m http.server 8000 &
```

브라우저로 다음을 확인:
- `http://localhost:8000/projects/adbtool/` — macOS 카드에 v1.1.0이 "최신 버전"으로,
  v1.0.1이 "이전 버전 보기" 안에 있는지. v0.9.0(macOS 자산 없음)은 어디에도 안 보이는지.
  Windows 카드는 항상 "TBD"/준비 중 문구인지.
- `http://localhost:8000/projects/androiddeveloper/` — Android 카드에 v2.3.0/v2.2.0이
  최신/이전으로 나뉘어 보이는지.
- 시스템 다크모드로 전환해 색상이 정상 적용되는지.
- 상단 nav의 "toys" 탭이 active로 표시되는지(Task 2에서 만든 로직).

확인 후 서버 종료:

```bash
kill %1
```

(`projects/`는 `.gitignore`에 있으므로 지우지 않아도 커밋에 안 잡히지만, 깨끗하게 하려면
`rm -rf projects` 실행해도 된다.)

- [ ] **Step 8: Commit**

```bash
git add scripts/build-download-pages.js scripts/build-download-pages.test.js \
  fixtures/releases/AdbTool.json fixtures/releases/AndroidDeveloper.json .gitignore
git commit -m "scripts: build-download-pages CLI 진입점과 목업 fixtures 추가

--mock-dir로 실제 GitHub API 호출 없이 로컬에서 결과 HTML을 미리 볼 수 있게 함."
```

---

### Task 9: `scripts/notify-redeploy.js` — 다른 레포용 재배포 트리거 스크립트

**Files:**
- Create: `scripts/notify-redeploy.js`
- Create: `scripts/notify-redeploy.test.js`

**Interfaces:**
- Produces: `buildDispatchRequest(token: string): {url: string, options: RequestInit}`
  (네트워크 호출 없는 순수 함수 — 테스트 대상). CLI로 실행하면 실제 `fetch`를 수행한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/notify-redeploy.test.js` 생성:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDispatchRequest } = require('./notify-redeploy');

test('buildDispatchRequest throws a clear error without a token', () => {
  assert.throws(() => buildDispatchRequest(undefined), /ABOUT_REPO_PAT/);
});

test('buildDispatchRequest builds a POST to the about dispatches endpoint', () => {
  const { url, options } = buildDispatchRequest('fake-token');
  assert.equal(url, 'https://api.github.com/repos/touktw/about/dispatches');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer fake-token');
  assert.equal(JSON.parse(options.body).event_type, 'project-released');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/notify-redeploy.test.js`
Expected: FAIL — `Cannot find module './notify-redeploy'`

- [ ] **Step 3: 구현 작성**

`scripts/notify-redeploy.js` 생성:

```js
#!/usr/bin/env node
// 다른 프로젝트 레포의 release 워크플로우에서 이 스크립트를 참조해 about 사이트의
// 재배포를 즉시 트리거한다. 실행 전 ABOUT_REPO_PAT 환경변수(about 레포에 대한
// repo 스코프 PAT, 호출하는 쪽 레포의 secret으로 저장)가 필요하다.
//
// 사용 예 (다른 레포의 release 워크플로우 안에서):
//   ABOUT_REPO_PAT=*** node scripts/notify-redeploy.js
'use strict';

function buildDispatchRequest(token) {
  if (!token) {
    throw new Error("ABOUT_REPO_PAT 환경변수(about 레포 PAT)가 필요합니다");
  }
  return {
    url: "https://api.github.com/repos/touktw/about/dispatches",
    options: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({ event_type: "project-released" })
    }
  };
}

async function main() {
  const { url, options } = buildDispatchRequest(process.env.ABOUT_REPO_PAT);
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`dispatch 실패: ${res.status}`);
  }
  console.log("about 재배포 트리거 완료");
}

module.exports = { buildDispatchRequest };

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/notify-redeploy.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/notify-redeploy.js scripts/notify-redeploy.test.js
git commit -m "scripts: 다른 레포에서 about 재배포를 트리거하는 notify-redeploy 추가"
```

---

### Task 10: `.github/workflows/pages.yml` — mirror curl 제거, 빌드 스텝/트리거 추가

**Files:**
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: Task 8의 `node scripts/build-download-pages.js --out=_site/projects` (환경변수
  `GITHUB_TOKEN` 필요).

- [ ] **Step 1: 워크플로우 파일 전체 교체**

`.github/workflows/pages.yml` 전체를 다음으로 교체:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  schedule:
    # 다른 프로젝트 레포에 새 릴리스가 나와도 이 저장소 자체엔 push가 없어서 자동으로
    # 안 새로고침되므로, 매주 월요일에 재배포해서 따라잡는다. 급하게 반영해야 하면
    # workflow_dispatch로 수동 실행하거나, 프로젝트 레포의 release 워크플로우에서
    # scripts/notify-redeploy.js로 repository_dispatch를 쏘면 즉시 재배포된다.
    - cron: "23 5 * * 1"
  repository_dispatch:
    types: [project-released]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Stage static files
        run: |
          mkdir _site
          rsync -a \
            --exclude='.git' --exclude='.github' \
            --exclude='scripts' --exclude='fixtures' --exclude='docs' \
            ./ _site/
          rm -rf _site/projects

      - name: Build project download pages
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/build-download-pages.js --out=_site/projects

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

      - id: deployment
        uses: actions/deploy-pages@v4
```

(변경 요약: ① "이미 배포된 Pages를 curl로 미러링" 스텝 제거, ② `scripts`/`fixtures`/`docs`를
배포 산출물에서 제외 — 이전에는 이 디렉터리들이 없어서 문제되지 않았지만 이번 작업으로
생겼으므로 공개 사이트에 내부 스크립트/스펙 문서가 그대로 노출되지 않게 막아야 한다,
③ `actions/setup-node` 추가, ④ `node scripts/build-download-pages.js` 빌드 스텝 추가,
⑤ `repository_dispatch: types: [project-released]` 트리거 추가.)

- [ ] **Step 2: YAML 유효성 확인**

Run:
```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/pages.yml'))" 2>&1 || \
  python3 -c "import json,sys; print('yaml module missing, skipping strict parse')"
```
Expected: 에러 없이 종료 (yaml 모듈이 없는 환경이면 두 번째 출력만 나와도 무방 — 그 경우
GitHub Actions 문법 확인은 Step 3의 `workflow_dispatch` 수동 실행으로 대체).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "pages.yml: 프로젝트 Pages 미러링을 자체 빌드 스텝으로 교체

AdbTool/AndroidDeveloper가 자체 GitHub Pages를 걷어내는 중이라 기존
curl 미러링 스텝은 곧 깨진다. scripts/build-download-pages.js가 각
프로젝트의 GitHub Releases API를 직접 읽어 다운로드 페이지를 생성하도록
바꾸고, repository_dispatch로 즉시 재배포 트리거도 받을 수 있게 함."
```

- [ ] **Step 4: 실제 배포로 최종 확인 (K님 확인 필요)**

로컬에서는 GitHub Pages 배포 자체를 재현할 수 없으므로, main에 push된 뒤 GitHub Actions의
"Deploy GitHub Pages" 워크플로우를 `workflow_dispatch`로 1회 수동 실행하고 로그에서:
- `Build project download pages` 스텝이 `built androiddeveloper/index.html`,
  `built adbtool/index.html`을 출력하는지
- 배포된 `https://teo.kim/projects/adbtool/`, `https://teo.kim/projects/androiddeveloper/`가
  정상적으로 뜨는지 (이 시점에 AdbTool/AndroidDeveloper 레포에 실제 릴리스가 있어야
  "릴리스가 없습니다"가 아니라 실제 다운로드 카드가 보인다 — 릴리스 유무는 K님이 다른
  레포 마이그레이션과 맞춰 확인)
- `https://teo.kim/scripts/`, `https://teo.kim/docs/` 등이 404인지(내부 파일이 공개되지
  않았는지)

를 확인해주세요.

---

## Self-Review 결과

- **스펙 커버리지**: 설계 문서 §4(data.js 스키마) → Task 1, §5(build script) → Task 4-8,
  §6(페이지 구조/스타일) → Task 3/7, §7(에러 처리) → Task 6/7, §8(pages.yml/notify script)
  → Task 9-10, §9(테스트) → 각 Task의 `node:test` + Task 8의 수동 미리보기. 누락 없음.
- **플레이스홀더 스캔**: "TBD"/"TODO" 같은 미완성 표기 없음(단, `Windows` 플랫폼 자체가
  기능적으로 "TBD" 배지를 갖는 것은 스펙에 명시된 의도된 동작이지 플레이스홀더가 아님).
- **타입/시그니처 일관성**: `renderPlatformCard(project, platform, state)`의 `state` shape
  (`{apiError?, matches?}`)이 Task 6 테스트·Task 7 `buildProject` 호출부에서 동일하게 쓰임.
  `module.exports` 목록이 Task 4→5→6→7→8 진행에 따라 이전 내보내기를 계속 포함하도록
  누적 갱신됨을 각 Task에서 명시함.
