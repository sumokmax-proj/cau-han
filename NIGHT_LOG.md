# NIGHT_LOG

새 기록은 맨 위에 추가한다. 형식: 바뀐 것 / 확인 방법 / 막힌 것 / 아내 검수 필요

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
