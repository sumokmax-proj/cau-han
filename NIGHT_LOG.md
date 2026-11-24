# NIGHT_LOG

새 기록은 맨 위에 추가한다. 형식: 바뀐 것 / 확인 방법 / 막힌 것 / 검수 필요

## 2026-11-24 밤 — 단어 데이터 분리, 음성 경로, 복습 테스트, 리포트 지표, 첫 기획 사이클

### 바뀐 것
- 개발 모델이 Sonnet으로 바뀐 것에 맞춰 BACKLOG, PRD 결정 기록, plan-cycle 스킬, learner-critic의 "Haiku" 표현을 Sonnet으로 수정
- `tests/walkthrough.js` 추가: `node tests/walkthrough.js [vi|ko]`가 홈 → 학습 5개 → 퀴즈 → 완료 → 홈 화면 텍스트를 순서대로 출력 (npm test에는 포함 안 됨)
- 단어 20개를 `content/words.json`으로 분리(전부 reviewed:true, 내용은 원본과 완전히 같음을 비교로 확인). 앱은 fetch로 읽고 reviewed:true만 보여 준다. 읽기에 실패하면 베트남어 안내와 "Tải lại" 버튼을 보인다
- 문장마다 audio 자리(`audio/<단어>-<번호>.mp3`). 파일이 있으면 재생하고, 없거나 재생에 실패하면 기계 음성으로 대신한다. 아직 녹음 파일은 없어서 지금 사용자에게는 달라진 게 없다
- 스모크 테스트 보강: 복습 세션(학습한 단어 지금 복습하기 → 복습 5개를 정답으로 풀면 단계 1 → 2, 다음 복습 3일 뒤)
- 리포트 복사 텍스트에 "세션 길이(초)"(중앙값/마지막/끝까지 한 세션 수)와 "이미 앎 비율" 추가
- 테스트 공통 헬퍼 `tests/helpers/app.js`, 테스트 파일 4개로 늘어 npm test는 14개 통과
- 첫 /plan-cycle 실행: 새 증거 없음으로 기록, learner-critic 리뷰를 근거로 다음 밤 작업 5개 정리(docs/PLAN_LOG.md, BACKLOG.md)

### 확인 방법
- 로컬: `npm test` → pass 14, `node tests/walkthrough.js`, `npm run serve` → http://localhost:8080/ (index.html과 content/words.json 모두 200 확인)
- 배포(dev): https://sumokmax-proj.github.io/cau-han/dev/ — 홈에서 "Bắt đầu hôm nay"를 눌러 학습이 전과 똑같이 되는지 본다. dev 배포 워크플로 6건 모두 success, /dev/content/words.json 200 확인
- 리포트 지표: /dev/ 에서 한 세션을 끝낸 뒤 홈의 "Góp ý" → 아래 리포트 칸에 "세션 길이(초)"와 "이미 앎 비율"이 보임
- 음성 경로(폰에서): audio/ 폴더에 mp3를 넣기 전에는 스피커 버튼이 기계 음성으로 읽는다. 파일을 `audio/정보-0.mp3`로 넣으면 정보의 첫 문장이 그 파일로 재생되는지 본다(자동 테스트는 가짜 Audio로만 확인했고 실제 소리는 못 확인)

### 막힌 것
- [!] 표시한 항목 없음. 밤 작업 5개 모두 완료
- 사고 1건과 복구: BACKLOG 완료 항목을 옮기는 임시 스크립트가 "-"로 시작하는 줄을 grep 옵션으로 읽어 BACKLOG.md가 1줄로 비워진 채 커밋·푸시됨(dfb6132). 바로 발견해 이전 내용으로 복구하고 다시 푸시함(c7a21c7). 이후 스크립트에는 안전장치를 넣음. dev 히스토리에 이 두 커밋이 남아 있다
- jsdom에는 Audio.play()와 음성 합성이 없어, 테스트 헬퍼가 가짜를 끼운다(앱 문제 아님)
- 워크스루는 첫 보기를 누르는 방식이라 정답률이 낮게 나온다(그래서 learner-critic의 "2/9" 지적은 근거에서 제외). "다음 날 복습" 모드는 밤 작업으로 올림
- 사용 환경 한계: words.json을 fetch로 읽으므로 index.html을 파일로 직접 열면(file://) 앱이 뜨지 않는다. GitHub Pages와 npm run serve에서는 정상

### 검수 필요
- 새 베트남어 문구 2개(초안): 데이터 읽기 실패 안내 "Không tải được danh sách từ vựng. Hãy kiểm tra mạng rồi tải lại trang." 와 버튼 "Tải lại"
- 리포트 텍스트의 한국어 항목명(세션 길이(초), 이미 앎 비율)은 Max에게 보내는 용도라 베트남어 검수 대상 아님
- 단어·한자·Hán Việt 음은 하나도 바꾸지 않았다. 단어 내용 검수는 없음

### learner-critic 요약 (가상 사용자 Mai, 실제 사용 기록이 아니라 약한 근거)
- 점수(1~5): 첫1분 4 / 회사 4 / 수준 2 / 부담 4 / 베트남어 4 / 정확성 3 / 재방문 2
- 그만둘 이유 Top 3: (1) 수준이 쉬움: 첫 세션 5단어 중 3개가 이미 아는 단어 (2) 퀴즈가 같은 문장을 반복하고 오답 재출제 때 진행 분모가 늘어남 (3) 재방문 이유가 약함(워크스루가 첫날만 보여 불완전한 평가)
- 계속 쓸 이유: 함정 단어(정보 ≠ tình báo 등), 사무실 실제 문장, 압박 없음
- 확인 요청 받은 것: 회의 설명의 "kể cả họp nhỏ trong nhóm" 문장이 검수된 설명인지, 오답 보기 철자 "xuất trương"(출장)이 맞는지 → 테스터 검수 때 같이 봐 주세요(제가 한자 음을 판정하지는 않음)

### Max가 아침에 할 일
1. https://sumokmax-proj.github.io/cau-han/dev/ 를 **폰에서** 한 세션 해 보기(특히 스피커 버튼, 홈 숫자). 오늘 자동 테스트와 curl은 jsdom 기준이라 실제 브라우저·실제 소리는 확인하지 못했다
2. **dev → main 머지 판단**: 제 의견은 "폰에서 1번 확인하면 머지해도 됨". 이유: 화면과 진도(cauhan-poc-v1)는 그대로이고 기존 진도를 읽는 테스트가 있으며, 테스터에게 달라지는 점은 거의 없다(리포트에 줄 2개 추가). 위험은 (a) 첫 화면이 이제 words.json을 불러온 뒤에 뜬다는 점(느린 망에서 잠깐 빈 화면), (b) 폰에서 음성 재생을 직접 못 봤다는 점. 머지는 Max만 한다
3. BACKLOG "밤 작업" 5개 중 우선순위 확인. 접근성과 "오늘 완료"는 승인하신 대로 맨 위에 올렸다
4. docs/PLAN_LOG.md 맨 위 "Max에게 묻고 싶은 것" 2개에 답하기(테스터가 단어를 쉽다고 했는지, 홈의 음성 없음 문구)
5. 테스터가 쓰기 시작하면 리포트를 feedback/에 저장해 다음 /plan-cycle 때 증거로 쓰기

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
- 빈 cau-han/ 폴더는 Claude Code가 그 안에서 실행 중이라 잠시 못 지웠다가, 세션 위치가 바뀐 뒤 지움 (해결)
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
