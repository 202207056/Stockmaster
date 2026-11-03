import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.FormData = dom.window.FormData;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: StockSearch } = await server.ssrLoadModule('/src/components/common/StockSearch.jsx');
const { default: client } = await server.ssrLoadModule('/src/api/client.js');
const requests = [];
let popularFailure = false;
const popularRows = Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, name: `인기종목 ${i + 1}`, symbol_code: String(i + 1).padStart(6, '0'), change_rate: i === 0 ? 1.25 : i === 1 ? -2.5 : i === 2 ? null : 0 }));
client.defaults.adapter = async config => {
  if (config.url === '/stocks/popular-searches') {
    if (popularFailure) throw new Error('unavailable');
    return { config, status: 200, statusText: 'OK', headers: {}, data: [...popularRows].reverse() };
  }
  requests.push(config.params.search);
  return { config, status: 200, statusText: 'OK', headers: {}, data: config.params.search === '삼성' ? [{ name: '삼성전자', symbol_code: '005930' }] : [] };
};
function Location() { return React.createElement('output', null, useLocation().search); }

test('name search debounces typing, selects a result and handles no matches', async () => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  const fill = async value => act(async () => {
    const input = container.querySelector('input');
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(StockSearch), React.createElement(Location))));
    await fill('삼');
    await fill('삼성');
    await act(async () => new Promise(resolve => setTimeout(resolve, 380)));
    assert.deepEqual(requests, ['삼성']);
    assert.match(container.textContent, /삼성전자/);
    await act(async () => container.querySelector('[role="option"] button').click());
    assert.equal(new URLSearchParams(container.querySelector('output').textContent).get('code'), '005930');
    assert.equal(container.querySelector('[role="listbox"]'), null);
    await fill('없는종목');
    assert.doesNotMatch(container.textContent, /삼성전자/);
    await act(async () => new Promise(resolve => setTimeout(resolve, 380)));
    assert.match(container.textContent, /검색 결과가 없습니다/);
  } finally { await act(async () => root.unmount()); }
});

test('focus opens ten ranked suggestions with rates, typing switches lists, keyboard and clicks select stocks', async () => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(StockSearch), React.createElement(Location))));
    const input = container.querySelector('input');
    const key = async key => act(async () => input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true })));
    await act(async () => input.focus());
    const options = container.querySelectorAll('[role="option"]');
    assert.equal(options.length, 10);
    assert.match(options[0].textContent, /인기종목 1.*\+1.25%/);
    assert.match(options[1].textContent, /-2.50%/);
    assert.match(options[2].textContent, /—/);
    assert(options[0].querySelector('.text-red-500'));
    assert(options[1].querySelector('.text-blue-500'));
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    await key('ArrowUp');
    assert.equal(options[9].getAttribute('aria-selected'), 'true');
    await act(async () => container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(new URLSearchParams(container.querySelector('output').textContent).get('code'), '000010');
    assert.equal(container.querySelector('[role="listbox"]'), null);
    await act(async () => input.click());
    await key('Escape');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    await act(async () => input.click());
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '삼성');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    assert.equal(container.querySelectorAll('[role="option"]').length, 0);
    await act(async () => new Promise(resolve => setTimeout(resolve, 380)));
    assert.match(container.querySelector('[role="listbox"]').textContent, /삼성전자/);
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    assert.equal(container.querySelectorAll('[role="option"]').length, 10);
    await act(async () => container.querySelector('[role="option"] button').click());
    assert.equal(new URLSearchParams(container.querySelector('output').textContent).get('code'), '000001');
    await act(async () => input.click());
    await act(async () => input.blur());
    assert.equal(container.querySelector('[role="listbox"]'), null);
  } finally { await act(async () => root.unmount()); }
});

test('popular search failure is explicit and reopening retries', async () => {
  const root = createRoot(document.getElementById('root'));
  popularFailure = true;
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(StockSearch))));
    const input = document.querySelector('input');
    await act(async () => input.focus());
    assert.match(document.body.textContent, /조회할 수 없습니다/);
    assert.equal(document.querySelectorAll('[role="option"]').length, 0);
    await act(async () => input.blur());
    popularFailure = false;
    await act(async () => input.focus());
    assert.equal(document.querySelectorAll('[role="option"]').length, 10);
  } finally { popularFailure = false; await act(async () => root.unmount()); }
});
