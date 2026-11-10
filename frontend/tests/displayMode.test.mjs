import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/login' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let viewportWidth = 390;
window.matchMedia = query => ({ matches: query === '(max-width: 767px)' && viewportWidth <= 767, addEventListener() {}, removeEventListener() {} });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const { default: DisplayMode } = await server.ssrLoadModule('/src/components/layout/DisplayMode.jsx');
after(async () => { await server.close(); dom.window.close(); });

test('display switch preserves the live app without saving the selected version', async () => {
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(DisplayMode)));
    const frame = document.querySelector('iframe');
    assert.equal(document.querySelector('.display-shell').dataset.mode, 'mobile');
    const select = mode => window.dispatchEvent(new window.MessageEvent('message', { origin: window.location.origin, source: frame.contentWindow, data: { type: 'stockmaster:display-mode', mode } }));
    await React.act(async () => select('desktop'));
    assert.equal(document.querySelector('.display-shell').dataset.mode, 'desktop');
    assert.equal(localStorage.getItem('stockmaster:display-mode'), null);
    assert.equal(document.querySelector('iframe'), frame, 'switching must not remount forms or dialogs');
    await React.act(async () => select('mobile'));
    assert.equal(document.querySelector('.display-shell').dataset.mode, 'mobile');
    assert.equal(frame.getAttribute('src'), '/login');
  } finally { await React.act(async () => root.unmount()); }
});

test('each visit prioritizes the viewport over a previously saved version', async () => {
  for (const [width, expected, saved] of [[390, 'mobile', 'desktop'], [767, 'mobile', 'desktop'], [768, 'desktop', 'mobile'], [1440, 'desktop', 'mobile']]) {
    viewportWidth = width;
    localStorage.setItem('stockmaster:display-mode', saved);
    const root = createRoot(document.getElementById('root'));
    try {
      await React.act(async () => root.render(React.createElement(DisplayMode)));
      assert.equal(document.querySelector('.display-shell').dataset.mode, expected, `viewport ${width}px`);
      const frame = document.querySelector('iframe');
      await React.act(async () => window.dispatchEvent(new window.MessageEvent('message', {
        origin: window.location.origin, source: frame.contentWindow,
        data: { type: 'stockmaster:display-mode', mode: saved },
      })));
      assert.equal(document.querySelector('.display-shell').dataset.mode, saved, 'manual switching remains available');
    } finally { await React.act(async () => root.unmount()); }
  }
  viewportWidth = 390;
  localStorage.removeItem('stockmaster:display-mode');
});

test('only the same-origin app frame can update the shareable URL', async () => {
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(DisplayMode)));
    const frame = document.querySelector('iframe');
    const route = (origin, source, path) => window.dispatchEvent(new window.MessageEvent('message', { origin, source, data: { type: 'stockmaster:route', path } }));
    route('https://elsewhere.example', frame.contentWindow, '/assets');
    route(window.location.origin, window, '/assets');
    route(window.location.origin, frame.contentWindow, '//elsewhere.example');
    assert.equal(window.location.pathname, '/login');
    route(window.location.origin, frame.contentWindow, '/trading?code=005930');
    assert.equal(window.location.pathname + window.location.search, '/trading?code=005930');
    assert.equal(frame.getAttribute('src'), '/login', 'navigation does not reload the live app');
  } finally { await React.act(async () => root.unmount()); }
});
