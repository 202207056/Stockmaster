import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: PopularStocks } = await server.ssrLoadModule('/src/components/common/PopularStocks.jsx');
const { default: client } = await server.ssrLoadModule('/src/api/client.js');

test('popular ranking links to the selected stock and handles unavailable data', async () => {
  const container = document.getElementById('root');
  for (const fail of [false, true]) {
    client.defaults.adapter = async config => {
      assert.equal(config.url, '/stocks/popular-searches');
      assert.equal(config.cache, false);
      if (fail) throw new Error('unavailable');
      return { config, status: 200, statusText: 'OK', headers: {},
        data: [{ rank: 1, name: '삼성전자', symbol_code: '005930' }] };
    };
    const root = createRoot(container);
    try {
      await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(PopularStocks))));
      if (fail) {
        assert.match(container.textContent, /조회 불가/);
        assert.equal(container.querySelector('a'), null);
      } else {
        assert.match(container.textContent, /삼성전자/);
        assert.equal(container.querySelector('a').getAttribute('href'), '/trading?code=005930');
      }
    } finally { await act(async () => root.unmount()); }
  }
});

test('rates use directional colors and ranking slides upward through the last item', async t => {
  let tick;
  const originalInterval = globalThis.setInterval;
  t.mock.method(globalThis, 'setInterval', (callback, delay, ...args) => {
    if (delay === 4000) tick = callback;
    return originalInterval(callback, delay, ...args);
  });
  client.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: [
    { rank: 1, name: 'Samsung', symbol_code: '005930', change_rate: 2.31 },
    { rank: 2, name: 'SK', symbol_code: '000660', change_rate: -1.25 },
    { rank: 3, name: 'Flat', symbol_code: '000001', change_rate: 0 },
  ] });
  const container = document.getElementById('root');
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(PopularStocks))));
    assert.equal(container.querySelector('.text-red-500').textContent, '+2.31%');
    const link = container.querySelector('a');
    await act(async () => tick());
    assert.equal(container.querySelector('a'), link);
    assert.equal(link.getAttribute('href'), '/trading?code=000660');
    assert.match(container.querySelector('.ticker-out').textContent, /Samsung/);
    assert.equal(container.querySelector('.ticker-out').getAttribute('aria-hidden'), 'true');
    assert.equal(container.querySelector('.ticker-in .text-blue-500').textContent, '-1.25%');
    await act(async () => tick());
    assert.equal(container.querySelector('.ticker-in .tabular-nums').textContent, '0.00%');
    assert.match(container.querySelector('.ticker-in .tabular-nums').className, /text-gray-500/);
    await act(async () => tick());
    assert.equal(link.getAttribute('href'), '/trading?code=005930');
    assert.match(container.querySelector('.ticker-out').textContent, /Flat/);
  } finally { await act(async () => root.unmount()); }
});
