// 테스트 공통: index.html을 jsdom으로 열고, fetch는 디스크의 파일을 읽어 대신 응답한다.
// opts.fetch로 fetch를 바꿔 끼울 수 있다(읽기 실패 시나리오용). opts.html로 HTML을 바꿀 수 있다.
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const diskFetch = async (url) => {
  const file = path.join(ROOT, String(url).replace(/^\.?\//, '').split('?')[0]);
  if (!fs.existsSync(file)) return { ok: false, status: 404, json: async () => ({}), blob: async () => ({}) };
  const buf = fs.readFileSync(file);
  return { ok: true, status: 200, json: async () => JSON.parse(buf.toString('utf8')), blob: async () => buf };
};

async function openApp(opts = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(`jsdomError: ${e.message}`));
  virtualConsole.on('error', (...args) => errors.push(`console.error: ${args.join(' ')}`));
  const dom = new JSDOM(opts.html || HTML, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.scrollTo = () => {}; // jsdom이 구현하지 않은 API
      window.fetch = opts.fetch || diskFetch;
      if (opts.beforeParse) opts.beforeParse(window);
      window.addEventListener('error', (ev) => errors.push(`window.error: ${ev.message}`));
      window.addEventListener('unhandledrejection', (ev) => errors.push(`unhandledrejection: ${ev.reason}`));
    },
  });
  const { window } = dom;
  const app = window.document.getElementById('app');
  // 첫 화면(또는 읽기 실패 안내)이 그려질 때까지 기다린다
  for (let i = 0; i < 200 && app.innerHTML.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
  const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return { dom, window, document: window.document, app, errors, click };
}

module.exports = { openApp, ROOT };
