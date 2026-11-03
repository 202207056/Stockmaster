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
