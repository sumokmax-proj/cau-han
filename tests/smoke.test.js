// 스모크 테스트: index.html을 jsdom으로 열어
// 홈 → '오늘 학습 시작' → 새 단어 5개 학습 → 확인 퀴즈 → 완료 화면까지 클릭하고
// 그 사이 스크립트 에러가 0개인지 확인한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./helpers/app');

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
