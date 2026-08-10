# toy project 다운로드 페이지 중앙화 설계 문서

- 작성일: 2026-08-10
- 상태: 승인됨 (구현 계획 작성 대기)

## 1. 목표

`touktw/about`(이하 about)에서 등록·소개하는 toy project(AndroidDeveloper, AdbTool, 그리고
앞으로 추가될 레포들)의 다운로드 페이지를 about이 직접 생성하도록 바꾼다. 지금은 각
프로젝트 레포가 자체 GitHub Pages(`docs/site/download.html`)를 운영하고, about은 배포된
결과물을 `curl`로 그대로 미러링한다. 이 구조는 두 가지 문제가 있다.

- **템플릿 중복**: `style.css`, `download.html`의 nav/hero/release-card 마크업이 레포마다
  거의 동일하게 복붙되어 있다.
- **등록 이중 관리**: 새 프로젝트를 추가하려면 `about/data.js`(소개 카드용 메타데이터)와
  `about/.github/workflows/pages.yml`(mirror 대상 slug/repo 목록)을 따로 고쳐야 한다.

이번 설계 이후에는 **`about/data.js`의 `projects` 배열에 항목 하나를 추가하는 것만으로**
새 toy project의 다운로드 페이지가 자동으로 생성되는 것을 목표로 한다.

## 2. 범위

- 대상: `about` 레포 내부 변경만.
  - `data.js` 스키마 확장
  - `scripts/build-download-pages.js` 신규 작성
  - `scripts/notify-redeploy.js` 신규 작성 (다른 레포가 참조할 트리거 스크립트)
  - `.github/workflows/pages.yml` 수정
  - `style.css` 확장 (다운로드 페이지 전용 클래스 추가)
  - `render.js`의 `renderAppProject` 소폭 수정 (`platforms` 필드 형태 변경 대응)
- **범위 밖**: AndroidDeveloper/AdbTool 등 각 프로젝트 레포에서 `docs/site`와 자체
  `pages.yml`(release bake 로직 포함)을 걷어내는 마이그레이션은 K님이 별도로 진행한다.
  이 문서는 about이 그 마이그레이션을 받아들일 수 있는 인터페이스(release 자산 네이밍 규칙,
  redeploy 트리거 방법)까지만 정의한다.
- **범위 밖**: 프로젝트 소개(랜딩) 페이지. about의 `projects.html`이 이미 tagline/description/
  features/platforms를 전부 렌더링하고 있으므로, 각 레포의 마케팅용 `index.html`은 더 이상
  필요 없어진다는 것만 확인하고 별도 작업하지 않는다.

## 3. 신선도(freshness) 전략

about `pages.yml`은 지금처럼 `push` / 매주 월요일 `cron` / `workflow_dispatch`로 재배포된다.
다운로드 페이지는 **완전 정적(bake-only)** 으로 생성한다 — 클라이언트 JS로 GitHub API를
다시 호출하거나 `localStorage`에 캐싱하는 로직은 두지 않는다. 대신 다른 레포가 새 릴리스를
올린 직후 about 재배포를 즉시 트리거할 수 있도록 `repository_dispatch` 트리거와
`scripts/notify-redeploy.js`를 제공한다(§8).

## 4. `data.js` 스키마 변경

### Before

```js
{
  name: "ADB tools for desktop",
  tagline: "...",
  description: "...",
  platforms: ["macOS", "Windows"],
  features: [...],
  downloadUrl: "projects/adbtool",
  repoUrl: "https://github.com/touktw/AdbTool",
  license: "Apache License 2.0"
}
```

### After

```js
{
  name: "ADB tools for desktop",
  tagline: "...",
  description: "...",
  features: [...],
  repoName: "AdbTool",
  platforms: [
    { label: "macOS", assetPattern: "\\.(dmg|pkg)$|mac" },
    { label: "Windows", assetPattern: "\\.(exe|msi|zip)$|win", tbd: true }
  ],
  license: "Apache License 2.0"
}
```

- `repoName`이 새 필수 필드다. `touktw` 조직/계정 아래 있다고 가정한다(개인 toy project
  전제와 일치).
- `platforms`는 문자열 배열 대신 `{ label, assetPattern, tbd? }` 객체 배열이 된다.
  `assetPattern`은 release asset 파일명(소문자 변환 후)에 매칭할 정규식 문자열이다.
  `tbd: true`면 릴리스 유무와 무관하게 "준비 중" 카드를 고정 표시한다(§6, 지금 AdbTool의
  Windows 케이스).
- `slug`, `repoUrl`, `downloadUrl`은 더 이상 직접 적지 않는다. `data.js` 안에서
  `repoName`으로부터 자동 파생시킨다:

```js
SITE_DATA.projects = SITE_DATA.projects.map(function (p) {
  var slug = p.repoName.toLowerCase();
  return Object.assign({}, p, {
    slug: slug,
    repoUrl: "https://github.com/touktw/" + p.repoName,
    downloadUrl: "projects/" + slug + "/"
  });
});

if (typeof module !== "undefined") module.exports = SITE_DATA;
```

이 블록을 `data.js` 맨 아래(현재 `};`로 객체 리터럴이 끝나는 지점 바로 뒤)에 추가한다.
파생 로직이 한 곳에만 있으므로 `render.js`(브라우저)와 `scripts/build-download-pages.js`
(Node) 양쪽 모두 `p.slug`/`p.repoUrl`/`p.downloadUrl`을 이미 채워진 필드처럼 그대로 읽는다.
`module.exports` 가드는 브라우저에서는 `module`이 미정의라 그냥 스킵되고, Node에서
`require('./data.js')`로 읽을 때만 동작한다.

### `render.js` 수정

`renderAppProject`의 platforms 렌더링 부분만 `pf` → `pf.label`로 바뀐다:

```js
html += '<ul class="chips platforms">' +
  p.platforms.map(function (pf) { return '<li>' + pf.label + '</li>'; }).join('') +
  '</ul>';
```

다운로드/소스 코드 버튼(`p.downloadUrl`, `p.repoUrl` 사용 부분)은 파생 필드를 그대로 읽으므로
변경 없음.

## 5. `scripts/build-download-pages.js`

Node 내장 기능만 사용한다(Node 18+ 내장 `fetch` 사용, npm 의존성 추가 없음 — about은 지금
`package.json`이 없는 순수 정적 사이트라 이 상태를 유지한다). CommonJS로 작성해
`require('../data.js')`로 바로 읽는다.

**입력**: `SITE_DATA.projects` (via `require`), 환경변수 `GITHUB_TOKEN`, 출력 디렉터리
(`_site/projects`).

**처리 흐름** (프로젝트별로 순차 실행):

1. `GET https://api.github.com/repos/touktw/${p.repoName}/releases?per_page=50`,
   헤더 `Authorization: Bearer ${GITHUB_TOKEN}` + `Accept: application/vnd.github+json`.
   (참고: `GITHUB_TOKEN`은 about 레포 자신에게 발급된 토큰이지만, 공개 저장소의 공개
   Releases 데이터를 읽는 데는 어느 레포에 발급된 토큰이든 인증된 요청으로 처리되어 시간당
   호출 한도가 올라간다 — 다른 레포에 대한 별도 권한 부여가 필요 없다.)
2. 요청 실패(네트워크 오류, non-2xx) 시: 해당 프로젝트를 `apiError: true` 상태로 표시하고
   경고 로그만 남긴 뒤 다음 프로젝트로 진행한다(§7, 빌드 전체를 실패시키지 않음).
3. 성공 시 `draft === false`인 release만 남기고 `published_at` 내림차순 정렬.
4. `p.platforms`의 각 플랫폼에 대해:
   - `tbd: true`인 플랫폼은 release 조회 결과와 무관하게 항상 정적 "준비 중" 카드.
   - 그 외 플랫폼은, 정렬된 release 목록을 순회하며 각 release의 `assets[].name`을
     소문자로 바꿔 `new RegExp(assetPattern, "i")`로 테스트해 첫 매칭 asset을 찾는다.
     매칭 asset이 있는 release만 그 플랫폼의 목록에 포함(자산 없는 release는 조용히 제외,
     §7). 첫 번째가 "최신", 나머지가 "이전 버전".
5. release notes(`release.body`, GitHub Flavored Markdown 일부)는 AdbTool
   `download.html`의 `escapeHtml`/`renderNotes` 함수를 그대로 포팅해 사용한다(순수 문자열
   처리라 브라우저 의존 없이 Node에서도 동일하게 동작).
6. 프로젝트 하나당 HTML 문서 하나를 렌더링해 `_site/projects/${p.slug}/index.html`에 쓴다.
   about의 `themes.css`/`style.css`를 `<link>`로 참조하고(경로: `../../themes.css`,
   `../../style.css`), `nav.js`도 포함해 본 사이트와 동일한 상단 nav(`home · me · toys`)를
   보여준다.

**목업/로컬 실행 지원**: `--mock-dir=<dir>` 옵션을 받으면 실제 API 호출 대신
`<dir>/${repoName}.json`(GitHub Releases API 응답과 동일한 shape의 배열)을 읽어 같은 로직을
태운다. `fixtures/releases/AdbTool.json`, `fixtures/releases/AndroidDeveloper.json` 샘플을
같이 만들어 둔다.

## 6. 다운로드 페이지 구조 (about `style.css` 확장)

생성되는 `_site/projects/{slug}/index.html`은 about의 기존 페이지들과 같은 `.page`/`.panel`
레이아웃을 쓰되, 플랫폼 카드 영역만 AdbTool `download.html`에서 쓰던 클래스를 그대로 가져와
`style.css`에 추가한다: `.platform-grid`, `.platform-card`, `.platform-header`,
`.tbd-badge`, `.release-item`, `.dl-link`, `.notes`, `.status`, `.badge`. 색상은 이미
`themes.css`의 토큰을 공유하므로 새 변수는 필요 없다.

페이지 구성:

```
nav (about 공용 nav.js, "toys" active)
panel: 프로젝트명 + tagline + repoUrl 링크
panel(.platform-grid): platform-card × N
  - 최신 릴리스: 버전명/배포일/notes/다운로드 버튼
  - 이전 버전: <details> 안에 목록
  - tbd 플랫폼: "준비 중" 안내 + 저장소 링크
  - apiError 상태: "정보를 불러오지 못했습니다 — GitHub 저장소에서 확인해주세요" + 링크
panel: license
```

`nav.js`의 `currentPage()`가 `/projects/`로 시작하는 경로도 `"projects"`(toys 탭)로 인식하게
소폭 수정한다.

## 7. 에러/엣지 케이스

- 프로젝트 단위 API 실패 → 그 프로젝트 페이지만 안내 문구로 폴백, 다른 프로젝트/전체 배포는
  정상 진행(§5-2).
- `tbd: true` 플랫폼 → 항상 정적 "준비 중" (API 결과 무관).
- 플랫폼 asset이 없는 release → 해당 플랫폼 목록에서 조용히 제외(에러 아님).
- release가 아예 없는 저장소 → 모든 비-tbd 플랫폼이 "아직 릴리스가 없습니다" 안내.

## 8. `pages.yml` / `scripts/notify-redeploy.js`

`pages.yml`에서 기존 "이미 배포된 Pages를 curl로 미러링" 스텝을 제거하고 다음으로 교체:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Build project download pages
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/build-download-pages.js --out=_site/projects
```

트리거에 `repository_dispatch` 추가:

```yaml
on:
  push:
    branches: [main]
  schedule:
    - cron: "23 5 * * 1"
  repository_dispatch:
    types: [project-released]
  workflow_dispatch:
```

`scripts/notify-redeploy.js`는 다른 프로젝트 레포의 release 워크플로우가 참조해서 about에
`repository_dispatch` 이벤트를 쏘는 용도다:

```js
#!/usr/bin/env node
// 다른 프로젝트 레포의 release 워크플로우에서 이 스크립트를 참조해 about 사이트의
// 재배포를 즉시 트리거한다. 실행 전 ABOUT_REPO_PAT 환경변수(about 레포에 대한 repo
// 스코프 PAT, 호출하는 쪽 레포의 secret으로 저장)가 필요하다.
//
// 사용 예 (다른 레포의 release 워크플로우 안에서):
//   curl -fsSL https://raw.githubusercontent.com/touktw/about/main/scripts/notify-redeploy.js | \
//     ABOUT_REPO_PAT=*** node -

const token = process.env.ABOUT_REPO_PAT;
if (!token) {
  console.error("ABOUT_REPO_PAT 환경변수(about 레포 PAT)가 필요합니다");
  process.exit(1);
}

fetch("https://api.github.com/repos/touktw/about/dispatches", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json"
  },
  body: JSON.stringify({ event_type: "project-released" })
}).then((res) => {
  if (!res.ok) {
    console.error(`dispatch 실패: ${res.status}`);
    process.exit(1);
  }
  console.log("about 재배포 트리거 완료");
});
```

PAT 발급/시크릿 등록 등 호출하는 쪽(각 프로젝트 레포) 설정은 K님이 마이그레이션 시 직접
진행한다. about 쪽은 `repository_dispatch` 이벤트를 받는 것 외에 추가 시크릿이 필요 없다.

## 9. 테스트

정적 사이트 생성 스크립트이며 프레임워크 단위테스트 하네스는 이 규모에 과하다. 대신:

- `node scripts/build-download-pages.js --mock-dir=fixtures/releases --out=/tmp/preview`로
  로컬 실행 후 생성된 HTML을 브라우저로 열어 육안 확인 (최신/이전 버전, tbd 카드, 라이트/
  다크 테마, 좁은 화면 레이아웃).
- fixtures에 "release 없음", "release는 있지만 매칭 asset 없음", "API 실패"(별도 플래그나
  존재하지 않는 mock 파일)에 해당하는 케이스를 하나씩 포함시켜 폴백 문구가 올바르게
  뜨는지 확인.
- 실제 배포 전 `workflow_dispatch`로 1회 수동 실행해 GitHub Actions 로그와 실제 배포
  결과를 확인.
