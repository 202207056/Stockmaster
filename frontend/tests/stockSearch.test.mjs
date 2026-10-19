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
const { MemoryRouter, useLocation } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: StockSearch } = await server.ssrLoadModule('/src/components/common/StockSearch.jsx');
const { default: client } = await server.ssrLoadModule('/src/api/client.js');
const requests = [];
client.defaults.adapter = async config => {
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
