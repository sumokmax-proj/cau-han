# NIGHT_LOG

새 기록은 맨 위에 추가한다. 형식: 바뀐 것 / 확인 방법 / 막힌 것 / 검수 필요

## 2026-11-24 — 기획 키트 반영과 폴더 정리

### 바뀐 것
- Max가 넣은 기획 키트(cau-han-kit/)를 루트에 반영
  - CLAUDE.md, BACKLOG.md → 키트의 새 버전으로 교체
  - docs/PRD.md, docs/PLAN_LOG.md, feedback/README.md, .claude/(learner-critic 에이전트, plan-cycle 스킬) 추가
  - .gitignore에 feedback/*(README 제외), *.token 추가
- 중복 정리: 루트 PRD.md(= docs/PRD.md), cau-han/·cau-han-kit/(서로 같은 사본) 삭제. index.html은 키트와 동일해서 그대로 둠
- 이 NIGHT_LOG는 키트의 빈 템플릿 대신 기존 기록을 유지

### 확인 방법
- 루트에 docs/, feedback/, .claude/가 있고 중복 폴더가 없음
- `npm test` 통과

### 막힌 것
- 빈 cau-han/ 폴더 하나는 Claude Code가 그 안에서 실행 중이라 못 지움 (git에는 안 올라감). 세션을 끝낸 뒤 지우면 됨
- 키트 BACKLOG에서 빠진 이전 항목 "접근성 점검", "오늘 완료 상태 표시" → Max 승인으로 BACKLOG "제안"에 되살림 (밤 작업이 이미 5개라서)

### 검수 필요
- 없음 (앱 내용은 바꾸지 않음)

## 2026-11-24 — 저장소 연결과 배포 세팅

### 바뀐 것
- 로컬 폴더를 GitHub `sumokmax-proj/cau-han`에 연결 (기본 브랜치 main, 웹 업로드 커밋 `9938905` 위에서 시작)
- `package.json` + jsdom 스모크 테스트 `tests/smoke.test.js` 추가. `npm test`로 실행
  - 홈 → '오늘 학습 시작' → 새 단어 5개 학습 → 확인 퀴즈(틀리면 다시 나오는 문제 포함) → 완료 화면까지 클릭
  - 스크립트 에러 0개, 학습 단어 5개, localStorage에 5개 저장 확인
- `.gitignore` (node_modules, _site, .env 등)
- `.github/workflows/pages.yml`: main 또는 dev에 푸시되면 스모크 테스트 후 배포. main → 사이트 루트, dev → `/dev/`
- 이 PC에 GitHub CLI(gh) 설치 (winget)

### 확인 방법
- 로컬 테스트: `npm install` 후 `npm test` → "pass 1"
- 로컬 미리보기: `npm run serve` → http://localhost:8080/
- 배포: https://sumokmax-proj.github.io/cau-han/ (main), https://sumokmax-proj.github.io/cau-han/dev/ (dev)

### 막힌 것
- 토큰에 Pages 권한이 없어 API로 Pages를 켜지 못함 (403) → Max가 웹에서 Source: GitHub Actions로 켬 (해결)
- 토큰에 Contents·Workflows 쓰기 권한이 없어 푸시 403 → Max가 토큰 권한 추가 (해결)
- `github-pages` 환경이 main만 배포 허용 → dev 추가됨 (해결)
- 결과: main·dev 첫 배포 둘 다 성공, 두 주소 모두 200 응답 확인
- jsdom 31은 Node 24.15 이상이 필요한데 이 PC는 Node 24.12라서 jsdom 29로 고정함
- CLAUDE.md에는 "Claude는 main에 푸시하지 않는다"고 되어 있지만, 첫 세팅 커밋만 Max의 명시적 요청으로 main에 푸시함. 이후 작업은 dev에서만

### 아내 검수 필요
- 없음 (앱 내용은 바꾸지 않음)
