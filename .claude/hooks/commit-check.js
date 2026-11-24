#!/usr/bin/env node
// Stop 훅: Claude가 작업을 끝내려 할 때 dev 브랜치에 커밋·푸시되지 않은 변경이 있으면
// 끝내지 않고 CLAUDE.md 규칙대로 커밋·푸시하도록 지시한다.
// - dev 브랜치에서만 동작한다. main 등 다른 브랜치에서는 아무것도 하지 않는다(Claude는 main에 푸시하지 않는다).
// - 훅이 직접 커밋하지 않는 이유: npm test 확인, 한국어 한 줄 메시지, 비밀값 점검을 Claude가 해야 하기 때문이다.
const { execFileSync } = require('node:child_process');

let input = {};
try { input = JSON.parse(require('node:fs').readFileSync(0, 'utf8') || '{}'); } catch (e) { /* 입력 없음 */ }
if (input.stop_hook_active) process.exit(0); // 이미 한 번 지시했다면 무한 반복하지 않는다

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
try {
  if (git('branch', '--show-current') !== 'dev') process.exit(0);
  const dirty = git('status', '--porcelain');
  let unpushed = '';
  try { unpushed = git('log', 'origin/dev..HEAD', '--oneline'); } catch (e) { /* origin/dev 없음 */ }
  if (!dirty && !unpushed) process.exit(0);

  const what = [dirty && '커밋 안 된 변경', unpushed && '푸시 안 된 커밋'].filter(Boolean).join(' + ');
  console.log(JSON.stringify({
    decision: 'block',
    reason: `dev 브랜치에 ${what}이 있다. 끝내기 전에 CLAUDE.md 규칙대로 처리해라: ` +
      '(1) npm test 통과 확인 (2) 비밀값·feedback/ 내용이 섞이지 않았는지 git status로 확인 ' +
      '(3) 한국어 한 줄 메시지로 작게 커밋 (4) git push origin dev. ' +
      '테스트가 실패하면 커밋하지 말고 이유를 사용자에게 알려라. main에는 절대 푸시하지 않는다.',
  }));
} catch (e) {
  process.exit(0); // git을 쓸 수 없으면 조용히 넘어간다
}
