// 단어 데이터(content/words.json) 테스트: 구조, 검수 필터, 읽기 실패 안내
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openApp, ROOT } = require('./helpers/app');

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'words.json'), 'utf8'));
const clickOf = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true }));

test('words.json: 모든 단어가 필수 필드와 reviewed 값을 가진다', () => {
  assert.ok(words.length >= 20);
  const keys = new Set();
  for (const w of words) {
    assert.ok(w.k && !keys.has(w.k), `중복 또는 빈 단어: ${w.k}`);
    keys.add(w.k);
    assert.equal(typeof w.reviewed, 'boolean', `${w.k}: reviewed가 true/false여야 한다`);
    assert.ok(['A', 'B', 'C'].includes(w.t), `${w.k}: 유형은 A/B/C`);
    assert.ok(Array.isArray(w.s) && w.s.length > 0 && w.s.every((x) => x.length === 3 && x.every(Boolean)), `${w.k}: 음절·한자·Hán Việt`);
    assert.ok(w.vi && w.n && Array.isArray(w.ex) && w.ex.length >= 1, `${w.k}: 뜻·설명·예문`);
  }
});

test('앱: reviewed:true 단어만 보이고, 20개가 단어장에 나온다', async () => {
  const { app, errors } = await openApp();
  clickOf(app.querySelector('[data-act=book]'));
  assert.equal(app.querySelectorAll('[data-act=open]').length, words.filter((w) => w.reviewed).length);
  assert.deepEqual(errors, []);
});

test('앱: reviewed:false 단어는 화면에 나오지 않는다', async () => {
  const draft = { ...words[0], k: '초안단어', reviewed: false };
  const { app } = await openApp({
    fetch: async () => ({ ok: true, status: 200, json: async () => [...words, draft] }),
  });
  clickOf(app.querySelector('[data-act=book]'));
  assert.ok(!app.textContent.includes('초안단어'));
  assert.equal(app.querySelectorAll('[data-act=open]').length, words.length);
});

test('앱: words.json을 못 읽으면 베트남어 안내와 다시 불러오기 버튼을 보인다', async () => {
  for (const f of [
    async () => ({ ok: false, status: 404, json: async () => ({}) }),
    async () => { throw new Error('network'); },
  ]) {
    const { app } = await openApp({ fetch: f });
    assert.match(app.textContent, /Không tải được/);
    assert.ok(app.querySelector('[data-act=reload]'));
  }
});

test('기존 진도(cauhan-poc-v1)가 있으면 그대로 읽어 홈 숫자에 반영한다', async () => {
  const cards = {};
  words.slice(0, 3).forEach((w) => { cards[w.k] = { seen: true, stage: 1, due: Date.now() + 864e5, ok: 1, no: 0, known: false }; });
  const { app, errors } = await openApp({
    beforeParse: (w) => w.localStorage.setItem('cauhan-poc-v1', JSON.stringify({ ui: 'vi', rate: 0.9, cards, log: [], fb: [] })),
  });
  assert.match(app.querySelector('.stats').textContent, /3\/20/);
  assert.deepEqual(errors, []);
});
