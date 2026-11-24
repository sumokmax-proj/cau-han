// 리포트 복사 텍스트 테스트: 세션 길이(초)와 "이미 앎" 비율이 보이는지
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openApp, ROOT } = require('./helpers/app');

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'words.json'), 'utf8'));
const clickOf = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true }));

async function reportWith(progress) {
  const { app, errors } = await openApp({
    beforeParse: (w) => { if (progress) w.localStorage.setItem('cauhan-poc-v1', JSON.stringify(progress)); },
  });
  clickOf(app.querySelector('[data-act=fb]'));
  return { text: app.querySelector('#rep').value, errors };
}
const card = (known) => ({ seen: true, stage: 1, due: Date.now() + 864e5, ok: 1, no: 0, known });

test('리포트: 진도가 없으면 두 값은 "-"로 보인다', async () => {
  const { text, errors } = await reportWith(null);
  assert.match(text, /세션 길이\(초\): -/);
  assert.match(text, /이미 앎 비율: -/);
  assert.deepEqual(errors, []);
});

test('리포트: 세션 길이는 start~end 사이 초의 중앙값과 마지막 값, 이미 앎은 학습한 단어 대비 %', async () => {
  const t0 = Date.parse('2026-11-20T09:00:00Z');
  const log = [
    { t: t0, e: 'start', k: null, ok: null }, { t: t0 + 120e3, e: 'end', k: null, ok: null }, // 120초
    { t: t0 + 1e6, e: 'start', k: null, ok: null }, { t: t0 + 1e6 + 180e3, e: 'end', k: null, ok: null }, // 180초
    { t: t0 + 2e6, e: 'start', k: null, ok: null }, // 끝까지 가지 않은 세션: 뺀다
    { t: t0 + 3e6, e: 'start', k: null, ok: null }, { t: t0 + 3e6 + 600e3, e: 'end', k: null, ok: null }, // 600초
  ];
  const cards = {};
  words.slice(0, 4).forEach((w, i) => { cards[w.k] = card(i < 1); }); // 4개 중 1개 이미 앎
  const { text } = await reportWith({ ui: 'vi', rate: 0.9, cards, log, fb: [] });
  assert.match(text, /세션 길이\(초\): 중앙값 180 \/ 마지막 600 \(끝까지 한 세션 3개\)/);
  assert.match(text, /이미 앎 비율: 25% \(1\/4\)/);
});

test('리포트: 실제로 한 세션이 끝나면 세션 길이가 숫자로 들어간다', async () => {
  const { app, errors } = await openApp();
  clickOf(app.querySelector('[data-act=ui]'));
  clickOf(app.querySelector('button.btn.big[data-act=start]'));
  for (let i = 0; i < 200 && !app.querySelector('.done'); i++) {
    const el = app.querySelector('.opt[data-act=pick]') || app.querySelector('.opt[data-act=qpick]:not([disabled])') || app.querySelector('[data-act=next]');
    clickOf(el);
  }
  clickOf(app.querySelector('[data-act=home]'));
  clickOf(app.querySelector('[data-act=fb]'));
  assert.match(app.querySelector('#rep').value, /세션 길이\(초\): 중앙값 \d+ \/ 마지막 \d+ \(끝까지 한 세션 1개\)/);
  assert.deepEqual(errors, []);
});
