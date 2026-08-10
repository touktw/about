#!/usr/bin/env node
// 다른 프로젝트 레포의 release 워크플로우에서 이 스크립트를 참조해 about 사이트의
// 재배포를 즉시 트리거한다. 실행 전 ABOUT_REPO_PAT 환경변수(about 레포에 대한 PAT,
// 호출하는 쪽 레포의 secret으로 저장)가 필요하다.
//
// PAT는 classic(repo 스코프) 대신 fine-grained PAT로 발급하고, 대상 저장소를
// touktw/about 하나로만 한정한 뒤 Contents: Read and write 권한만 부여할 것.
// classic repo 스코프 PAT는 touktw 계정의 모든 레포에 쓰기 권한을 주기 때문에,
// 호출하는 레포 쪽 secret이 유출되면 피해 범위가 계정 전체로 커진다.
//
// 사용 예 1 (다른 레포의 release 워크플로우 안에서, 이 스크립트를 직접 실행):
//   ABOUT_REPO_PAT=*** node scripts/notify-redeploy.js
//
// 사용 예 2 (이 스크립트 없이 워크플로우 step에서 바로 dispatch만 쏘고 싶을 때):
//   - name: Notify about of new release
//     run: |
//       curl -fsS -X POST \
//         -H "Authorization: Bearer ${{ secrets.ABOUT_REPO_PAT }}" \
//         -H "Accept: application/vnd.github+json" \
//         https://api.github.com/repos/touktw/about/dispatches \
//         -d '{"event_type":"project-released"}'
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
