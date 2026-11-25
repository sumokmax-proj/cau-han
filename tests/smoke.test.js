// 스모크 테스트: index.html을 jsdom으로 열어
// 홈 → '오늘 학습 시작' → 새 단어 5개 학습 → 확인 퀴즈 → 완료 화면까지 클릭하고
// 그 사이 스크립트 에러가 0개인지 확인한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openApp, ROOT } = require('./helpers/app');

const WORDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'words.json'), 'utf8'));

const clickOf = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true }));

test('오늘 학습: 새 단어 5개 → 확인 퀴즈 → 완료 화면, 스크립트 에러 0개', async () => {
  const { document, errors } = await openApp();
  const app = document.getElementById('app');
  assert.ok(app.innerHTML.length > 0, '홈 화면이 렌더링되어야 한다');

  // 홈 화면: UI를 한국어로 바꾸고 '오늘 학습 시작' 버튼을 찾는다
  clickOf(app.querySelector('[data-act=ui]'));
  const startBtn = [...app.querySelectorAll('button.btn.big[data-act=start]')]
    .find((b) => b.textContent.trim() === '오늘 학습 시작');
  assert.ok(startBtn, "'오늘 학습 시작' 버튼이 있어야 한다");
  clickOf(startBtn);

  const learned = new Set();
  let quizzes = 0;
  for (let step = 0; step < 200 && !app.querySelector('.done'); step++) {
    const learnOpt = app.querySelector('.opt[data-act=pick]');
    const quizOpt = app.querySelector('.opt[data-act=qpick]:not([disabled])');
    const next = app.querySelector('[data-act=next]');
    if (learnOpt) {
      learned.add(app.querySelector('.kw').textContent);
      clickOf(learnOpt);
      assert.ok(app.querySelector('.bridge'), '학습 답을 고르면 다리 카드가 보여야 한다');
    } else if (quizOpt) {
      quizzes++;
      clickOf(quizOpt);
      assert.ok(app.querySelector('.fb'), '퀴즈 답을 고르면 피드백이 보여야 한다');
    } else if (next) {
      clickOf(next);
    } else {
      assert.fail(`진행할 버튼이 없음 (step ${step}): ${app.innerHTML.slice(0, 200)}`);
    }
  }

  const done = app.querySelector('.done');
  assert.ok(done, '완료 화면에 도달해야 한다');
  assert.equal(learned.size, 5, '새 단어 5개를 학습해야 한다');
  assert.ok(quizzes >= 5, `확인 퀴즈를 5개 이상 풀어야 한다 (실제 ${quizzes})`);
  assert.match(done.textContent, /완료!/);
  assert.match(done.textContent, /새 단어 5/);

  // 진도가 localStorage에 저장되었는지
  const saved = JSON.parse(document.defaultView.localStorage.getItem('cauhan-poc-v1'));
  assert.equal(Object.values(saved.cards).filter((c) => c.seen).length, 5);

  assert.deepEqual(errors, [], '스크립트 에러가 없어야 한다');
});

// 지금 보이는 퀴즈의 정답 보기. 노란 표시(mark) 또는 빈칸 문장으로 단어를 찾는다.
function correctOption(app) {
  const kr = app.querySelector('.kr');
  const mark = kr.querySelector('mark');
  const cloze = !!kr.querySelector('.blank');
  const w = cloze
    ? WORDS.find((x) => x.ex[0][0].replace(x.k, '') === kr.textContent)
    : WORDS.find((x) => x.k === (mark && mark.textContent));
  if (!w) return null;
  const want = cloze ? w.k : w.vi;
  return [...app.querySelectorAll('.opt[data-act=qpick]:not([disabled])')].find((b) => b.textContent === want);
}

// 세션 하나를 완료 화면까지 진행한다. 본 것을 세어 돌려준다.
// correct=true이면 복습 문제는 정답 보기를 골라서 누른다.
function runSession(app, correct = false) {
  const seen = { learn: 0, quiz: 0, review: 0 };
  for (let step = 0; step < 300 && !app.querySelector('.done'); step++) {
    const learnOpt = app.querySelector('.opt[data-act=pick]');
    const quizOpt = app.querySelector('.opt[data-act=qpick]:not([disabled])');
    const next = app.querySelector('[data-act=next]');
    if (learnOpt) { seen.learn++; clickOf(learnOpt); }
    else if (quizOpt) {
      seen.quiz++;
      const isReview = !!app.querySelector('.tagr');
      if (isReview) seen.review++;
      clickOf(correct && isReview ? correctOption(app) || quizOpt : quizOpt);
    }
    else if (next) clickOf(next);
    else assert.fail(`진행할 버튼이 없음 (step ${step}): ${app.innerHTML.slice(0, 200)}`);
  }
  return seen;
}

test('복습: 학습한 단어를 지금 복습하기 → 복습 세션 완료, 간격 반복 저장, 스크립트 에러 0개', async () => {
  const { document, errors } = await openApp();
  const app = document.getElementById('app');
  const ls = () => JSON.parse(document.defaultView.localStorage.getItem('cauhan-poc-v1'));
  clickOf(app.querySelector('[data-act=ui]')); // 화면 문구를 한국어로

  // 1) 먼저 오늘 학습으로 새 단어 5개를 배운다
  clickOf(app.querySelector('button.btn.big[data-act=start]'));
  runSession(app);
  assert.ok(app.querySelector('.done'), '첫 세션이 완료되어야 한다');
  clickOf(app.querySelector('[data-act=home]'));
  const learnedKeys = Object.keys(ls().cards).filter((k) => ls().cards[k].seen);
  assert.equal(learnedKeys.length, 5);

  // 2) 피드백 화면의 테스트 도구로 학습한 단어를 모두 복습 대상으로 만든다
  clickOf(app.querySelector('[data-act=fb]'));
  const testDue = [...app.querySelectorAll('[data-act=testdue]')].find((b) => b.textContent.trim() === '학습한 단어 지금 복습하기');
  assert.ok(testDue, "'학습한 단어 지금 복습하기' 버튼이 있어야 한다");
  clickOf(testDue);
  assert.match(app.textContent, /복습 대상으로 바꿨어요/);
  for (const k of learnedKeys) assert.ok(ls().cards[k].due <= Date.now(), `${k}: 복습 대상이어야 한다`);
  clickOf(app.querySelector('[data-act=back], [data-act=home]'));

  // 3) 홈에서 복습 대기 5개가 보이고, 시작하면 복습 문제가 나온다
  assert.match(app.querySelector('.stats').textContent, /5\s*복습 대기/);
  const start = app.querySelector('button.btn.big[data-act=start]');
  assert.ok(start, '홈에 시작 버튼이 있어야 한다');
  clickOf(start);
  assert.ok(app.querySelector('.tagr'), '첫 문제가 복습 표시(.tagr)를 달고 나와야 한다');
  const seen = runSession(app, true);
  assert.ok(seen.review >= 5, `복습 문제를 5개 이상 풀어야 한다 (실제 ${seen.review})`);

  // 4) 완료 화면에 복습 5가 보이고, 맞힌 단어의 복습 간격이 늘었다
  const done = app.querySelector('.done');
  assert.ok(done, '복습 세션이 완료 화면에 도달해야 한다');
  assert.match(done.textContent, /복습 5/);
  const cards = ls().cards;
  for (const k of learnedKeys) {
    assert.equal(cards[k].stage, 2, `${k}: 복습을 맞히면 단계가 1 → 2로 올라야 한다`);
    assert.ok(cards[k].due > Date.now() + 2 * 864e5, `${k}: 다음 복습은 3일 뒤여야 한다`);
  }

  assert.deepEqual(errors, [], '스크립트 에러가 없어야 한다');
});

/* ---------- 도장 ---------- */
const KEY = 'cauhan-poc-v1';
const readSt = (app) => JSON.parse(app.ownerDocument.defaultView.localStorage.getItem(KEY));
const openWith = (progress) => openApp({ beforeParse: (w) => w.localStorage.setItem(KEY, JSON.stringify(progress)) });
const q = (app, sel) => app.querySelector(sel);
const homeSeals = (app) => q(app, '.sstamp').textContent.trim();
const doneStamps = (app) => [...app.querySelectorAll('.done .stamps li')];

// 완료 화면까지 진행한다. missFirst면 단어마다 첫 퀴즈는 오답을, 재출제는 정답을 고른다.
function play(app, missFirst = false) {
  const missed = new Set();
  for (let step = 0; step < 300 && !q(app, '.done'); step++) {
    const learnOpt = q(app, '.opt[data-act=pick]');
    const quizOpt = q(app, '.opt[data-act=qpick]:not([disabled])');
    if (learnOpt) clickOf(learnOpt);
    else if (quizOpt) {
      const right = correctOption(app);
      assert.ok(right, '정답 보기를 찾아야 한다');
      // 재출제는 문제 유형이 달라질 수 있어 보기 글자가 아니라 단어로 구분한다
      const mark = q(app, '.kr mark');
      const word = mark ? mark.textContent : right.textContent;
      if (missFirst && !missed.has(word)) {
        missed.add(word);
        clickOf([...app.querySelectorAll('.opt[data-act=qpick]')].find((b) => b !== right));
      } else clickOf(right);
    } else clickOf(q(app, '[data-act=next]'));
  }
  assert.ok(q(app, '.done'), '완료 화면에 도달해야 한다');
}
// 테스트 도구로 학습한 단어를 모두 복습 대상으로 만든 뒤 홈에서 다시 시작한다
function reviewRound(app) {
  if (q(app, '.done')) clickOf(q(app, '[data-act=home]'));
  clickOf(q(app, '[data-act=fb]'));
  clickOf(q(app, '[data-act=testdue]'));
  clickOf(q(app, '[data-act=home]'));
  clickOf(q(app, 'button.btn.big[data-act=start]'));
}

test('도장: 퀴즈를 맞히면 완료 화면·홈·단어장에 도장, 애니메이션은 한 번만', async () => {
  const { app, errors } = await openApp();
  clickOf(q(app, '[data-act=ui]'));
  assert.equal(homeSeals(app), '도장 0개');
  clickOf(q(app, 'button.btn.big[data-act=start]'));
  play(app);

  assert.match(q(app, '.done').textContent, /오늘 찍은 도장/);
  assert.equal(doneStamps(app).length, 5);
  assert.equal(app.querySelectorAll('.done .stamps .stp.s1').length, 5, '첫 도장은 1단계');
  for (const li of doneStamps(app)) {
    const w = WORDS.find((x) => x.k === li.querySelector('.kr').textContent);
    assert.equal(li.querySelector('.stp').textContent, w.s.map((x) => x[1]).join(''), '도장 한자는 words.json의 것');
  }
  assert.equal(app.querySelectorAll('.done .press').length, 5);
  clickOf(q(app, '[data-act=rate]'));
  assert.equal(doneStamps(app).length, 5, '평가를 눌러도 도장은 남는다');
  assert.equal(app.querySelectorAll('.done .press').length, 0, '다시 그릴 때 애니메이션은 반복하지 않는다');

  clickOf(q(app, '[data-act=home]'));
  assert.equal(homeSeals(app), '도장 5개');
  assert.equal(app.querySelectorAll('.stats .st:not(.sstamp)').length, 4, '기존 통계 4칸은 그대로');

  clickOf(q(app, '[data-act=book]'));
  assert.equal(app.querySelectorAll('.row .stp').length, 20);
  assert.equal(app.querySelectorAll('.row .stp.s1').length, 5);
  assert.equal(app.querySelectorAll('.row .stp.s0').length, 15);
  for (const e of app.querySelectorAll('.row .stp.s0')) assert.equal(e.textContent, '', '도장이 없으면 빈 칸');
  assert.deepEqual(errors, []);
});

test('도장: 3일 이상 간격 복습을 맞히면 2단계, 30일 간격을 통과하면 3단계', async () => {
  const { app, errors } = await openApp();
  clickOf(q(app, '[data-act=ui]'));
  clickOf(q(app, 'button.btn.big[data-act=start]'));
  play(app);
  const first = Object.keys(readSt(app).cards);
  // [복습 뒤 단계, 완료 화면에 나오는지]. 복습 n회째에 통과하는 간격은 1, 3, 7, 14, 30일
  const expected = [[1, false], [2, true], [2, false], [2, false], [3, true]];
  expected.forEach(([level, shown], i) => {
    reviewRound(app);
    play(app);
    const cards = readSt(app).cards;
    const names = doneStamps(app).map((li) => li.querySelector('.kr').textContent);
    for (const k of first) {
      assert.equal(cards[k].sl, level, `${k}: 복습 ${i + 1}회 뒤 도장 단계`);
      assert.equal(names.includes(k), shown, `${k}: 복습 ${i + 1}회 완료 화면 표시`);
    }
  });
  assert.deepEqual(errors, []);
});

test('도장: 틀려도 받은 도장은 옅어지지 않는다', async () => {
  const cards = { 정보: { seen: true, stage: 3, due: 0, ok: 3, no: 0, known: false } };
  const { app, errors } = await openWith({ ui: 'ko', rate: 0.9, cards, log: [], fb: [] });
  clickOf(q(app, 'button.btn.big[data-act=start]'));
  assert.ok(q(app, '.tagr'), '첫 문제는 복습');
  const right = correctOption(app);
  clickOf([...app.querySelectorAll('.opt[data-act=qpick]')].find((b) => b !== right));
  assert.equal(readSt(app).cards['정보'].stage, 1);
  assert.equal(readSt(app).cards['정보'].sl, 2);
  assert.deepEqual(errors, []);
});

test('도장: 오늘 새 도장이 없으면 완료 화면에 도장 영역이 없다', async () => {
  const cards = Object.fromEntries(WORDS.map((w) => [w.k, { seen: true, stage: 1, due: Date.now() + 864e5, ok: 1, no: 0, known: false }]));
  cards['정보'].due = 0; // 1일 간격 복습 하나: 통과해도 1단계 그대로
  const { app, errors } = await openWith({ ui: 'ko', rate: 0.9, cards, log: [], fb: [] });
  clickOf(q(app, 'button.btn.big[data-act=start]'));
  play(app);
  assert.equal(q(app, '.done .stamps'), null);
  assert.doesNotMatch(q(app, '.done').textContent, /오늘 찍은 도장/);
  assert.deepEqual(errors, []);
});

test('도장: 첫 시도에 틀려도 같은 세션 재출제를 맞히면 첫 도장', async () => {
  const { app, errors } = await openApp();
  clickOf(q(app, 'button.btn.big[data-act=start]'));
  play(app, true);
  assert.equal(app.querySelectorAll('.done .stamps .stp.s1').length, 5);
  assert.ok(Object.values(readSt(app).cards).every((c) => c.no === 1 && c.sl === 1));
  assert.deepEqual(errors, []);
});

test('도장: "이미 알아요"는 도장 없이 시작하고, 완성 도장은 실제 복습을 맞힌 뒤에만', async () => {
  const { app, errors } = await openApp();
  clickOf(q(app, '[data-act=ui]'));
  clickOf(q(app, 'button.btn.big[data-act=start]'));
  for (let i = 0; i < 5; i++) { clickOf(q(app, '[data-act=know]')); clickOf(q(app, '[data-act=next]')); }
  assert.ok(q(app, '.done'));
  assert.equal(q(app, '.done .stamps'), null);
  const keys = Object.keys(readSt(app).cards);
  clickOf(q(app, '[data-act=home]'));
  assert.equal(homeSeals(app), '도장 0개');
  // 첫 복습 = 14일 간격 → 2단계, 다음 복습 = 30일 간격 → 3단계
  for (const level of [2, 3]) {
    reviewRound(app);
    play(app);
    for (const k of keys) assert.equal(readSt(app).cards[k].sl, level, `${k}: ${level}단계`);
  }
  assert.deepEqual(errors, []);
});

test('도장: 도장 필드가 없는 기존 진도는 에러 없이 소급 표시되고, 오늘 찍은 도장에는 안 나온다', async () => {
  const c = (stage, ok, extra = {}) => ({ seen: true, stage, due: Date.now() + 864e5, ok, no: 0, known: false, ...extra });
  const cards = {
    정보: c(1, 1), // 첫 퀴즈 통과 → 1
    처리: c(3, 3), // 3일 간격 통과 → 2
    회의: c(5, 5), // 30일 통과 여부는 알 수 없음 → 2
    확인: c(4, 0, { known: true }), // 이미 앎, 복습 전 → 없음
    제출: c(5, 1, { known: true }), // 이미 앎 + 14일 복습 통과 → 2
    진행: c(1, 0, { no: 1 }), // 틀렸지만 로그에 재출제 정답 → 1
    승인: c(1, 0, { no: 1 }), // 맞힌 기록 없음 → 없음
  };
  const log = [{ t: Date.now() - 1000, e: 'quiz', k: '진행', ok: true }];
  const { app, errors } = await openWith({ ui: 'ko', rate: 0.9, cards, log, fb: [] });
  assert.equal(homeSeals(app), '도장 5개');
  clickOf(q(app, '[data-act=book]'));
  const level = (k) => q(app, `.row[data-k="${k}"] .stp`).className.replace('stp ', '');
  assert.deepEqual(Object.keys(cards).map(level), ['s1', 's2', 's2', 's0', 's2', 's1', 's0']);
  const saved = readSt(app).cards;
  for (const k of Object.keys(cards)) {
    const { sl, ...rest } = saved[k];
    assert.deepEqual(rest, cards[k], `${k}: 기존 필드는 바뀌지 않는다`);
  }
  // 새 단어를 배우면 오늘 찍은 도장에는 새 단어만 나온다
  clickOf(q(app, '[data-act=home]'));
  clickOf(q(app, 'button.btn.big[data-act=start]'));
  play(app);
  const names = doneStamps(app).map((li) => li.querySelector('.kr').textContent);
  assert.equal(names.length, 5);
  for (const k of Object.keys(cards)) assert.ok(!names.includes(k), `${k}: 소급분은 안 나온다`);
  assert.deepEqual(errors, []);
});
