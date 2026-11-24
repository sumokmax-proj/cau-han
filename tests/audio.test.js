// 문장 음성 재생 경로 테스트: 녹음 파일(audio)이 있으면 파일을 재생하고, 없으면 기계 음성(TTS)을 쓴다.
// 실제 소리는 내지 않고 Audio / speechSynthesis를 가짜로 끼워 어느 경로를 탔는지만 기록한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openApp, ROOT } = require('./helpers/app');

const FIXTURES = path.join(__dirname, 'fixtures');
const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'words.json'), 'utf8'));

function fakes(calls) {
  return (w) => {
    w.speechSynthesis = { getVoices: () => [], addEventListener() {}, cancel() {}, speak: (u) => calls.push({ via: 'tts', text: u.text }) };
    w.SpeechSynthesisUtterance = function (text) { this.text = text; };
    // 가짜 Audio: tests/fixtures 아래에 파일이 있을 때만 재생에 성공한다
    w.Audio = function (src) {
      const handlers = {};
      this.addEventListener = (ev, fn) => { handlers[ev] = fn; };
      this.pause = () => {};
      this.play = () => {
        if (fs.existsSync(path.join(FIXTURES, src))) { calls.push({ via: 'audio', src }); return Promise.resolve(); }
        if (handlers.error) handlers.error();
        return Promise.reject(new Error('NotSupportedError'));
      };
    };
  };
}
const flush = () => new Promise((r) => setTimeout(r, 20));
const clickOf = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true }));

test('words.json: 모든 문장에 audio/<단어>-<번호>.mp3 자리가 있다', () => {
  for (const w of words) w.ex.forEach((e, i) => assert.equal(e[2], `audio/${w.k}-${i}.mp3`, `${w.k} 문장 ${i}`));
});

test('녹음 파일이 있는 문장은 파일을 재생하고, 기계 음성은 쓰지 않는다', async () => {
  const calls = [];
  const { app } = await openApp({ beforeParse: fakes(calls) });
  clickOf(app.querySelector('[data-act=book]'));
  clickOf([...app.querySelectorAll('[data-act=open]')].find((b) => b.dataset.k === '정보'));
  calls.length = 0; // 상세 화면 진입 시 나는 단어 발음은 제외
  const btn = [...app.querySelectorAll('.sent .spk')].find((b) => b.dataset.a === 'audio/정보-0.mp3');
  assert.ok(btn, '정보 첫 문장의 스피커 버튼에 audio 경로가 실려야 한다');
  clickOf(btn);
  await flush();
  assert.deepEqual(calls, [{ via: 'audio', src: 'audio/정보-0.mp3' }]);
});

test('녹음 파일이 없는 문장은 기계 음성으로 대신한다', async () => {
  const calls = [];
  const { app } = await openApp({ beforeParse: fakes(calls) });
  clickOf(app.querySelector('[data-act=book]'));
  clickOf([...app.querySelectorAll('[data-act=open]')].find((b) => b.dataset.k === '처리'));
  calls.length = 0;
  const btn = app.querySelector('.sent .spk');
  clickOf(btn);
  await flush();
  assert.equal(calls.length, 1, '정확히 한 번만 소리가 나야 한다');
  assert.equal(calls[0].via, 'tts');
  assert.equal(calls[0].text, words.find((w) => w.k === '처리').ex[0][0]);
});

test('audio 필드가 없는 문장도 기계 음성으로 재생된다(기존 데이터 호환)', async () => {
  const calls = [];
  const noAudio = words.map((w) => ({ ...w, ex: w.ex.map((e) => [e[0], e[1]]) }));
  const { app } = await openApp({
    beforeParse: fakes(calls),
    fetch: async () => ({ ok: true, status: 200, json: async () => noAudio }),
  });
  clickOf(app.querySelector('[data-act=book]'));
  clickOf(app.querySelector('[data-act=open]'));
  calls.length = 0;
  clickOf(app.querySelector('.sent .spk'));
  await flush();
  assert.deepEqual(calls.map((c) => c.via), ['tts']);
});
