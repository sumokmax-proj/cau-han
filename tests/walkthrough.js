// 워크스루: 첫 세션을 끝까지 진행하며 화면마다 사용자가 보는 텍스트를 순서대로 출력한다.
// learner-critic이 실제 화면 흐름을 보고 평가하도록 만든 도구다. (테스트가 아님: npm test에 포함되지 않음)
// 사용법: node tests/walkthrough.js [vi|ko]   (기본 vi = 실제 사용자가 보는 화면)
const { openApp } = require('./helpers/app');

const UI = process.argv[2] === 'ko' ? 'ko' : 'vi';

(async () => {
const { window, document, app, errors, click } = await openApp();

// 화면의 보이는 텍스트: 버튼은 [ ]로 표시해 무엇을 누를 수 있는지 보이게 한다
function visible() {
  const clone = app.cloneNode(true);
  clone.querySelectorAll('button, textarea').forEach((b) => {
    const label = b.getAttribute('aria-label') || b.textContent.trim() || b.getAttribute('placeholder') || '';
    b.replaceWith(document.createTextNode(` [${label}] `));
  });
  clone.querySelectorAll('div,p,li,h1,h2,h3,span.lab').forEach((e) => e.append('\n'));
  return clone.textContent.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
let n = 0;
const show = (title) => console.log(`\n===== 화면 ${++n}: ${title} =====\n${visible()}`);

if (UI === 'ko') click(app.querySelector('[data-act=ui]'));
show('홈 (처음 열었을 때)');
click(app.querySelector('button.btn.big[data-act=start]'));

for (let step = 0, learnNo = 0, quizNo = 0; step < 200 && !app.querySelector('.done'); step++) {
  const learnOpt = app.querySelector('.opt[data-act=pick]');
  const quizOpt = app.querySelector('.opt[data-act=qpick]:not([disabled])');
  const next = app.querySelector('[data-act=next]');
  if (learnOpt) {
    show(`학습 ${++learnNo} — 추측`);
    click(learnOpt);
    show(`학습 ${learnNo} — 다리 공개`);
  } else if (quizOpt) {
    show(`퀴즈 ${++quizNo} — 문제`);
    click(quizOpt);
    show(`퀴즈 ${quizNo} — 피드백`);
  } else if (next) {
    click(next);
  } else {
    console.log('진행할 버튼이 없음'); break;
  }
}
show('완료 화면');
click(app.querySelector('[data-act=home]'));
show('홈 (학습 후)');
if (errors.length) console.log('\n스크립트 에러:', errors);
})();
