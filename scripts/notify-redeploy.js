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
