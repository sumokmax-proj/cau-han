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
