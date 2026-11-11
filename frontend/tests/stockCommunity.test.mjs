import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const { default: StockCommunity } = await server.ssrLoadModule('/src/components/community/StockCommunity.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const client = await server.ssrLoadModule('/src/api/client.js');
after(async () => { await server.close(); dom.window.close(); });

test('stock opinions filter by symbol, cap ten posts, link to category and clear on stock change', async () => {
  client.setToken('stock-opinions-test');
  const calls = [];
  client.default.defaults.adapter = async config => {
    assert.equal(config.url, '/community/posts');
    calls.push(config.params);
    const items = config.params.symbol_code === '005930' ? Array.from({ length: 12 }, (_, i) => ({ post_id: i + 1, title: `Opinion ${i}`, content: 'Body', author_name: 'Investor', attachments: {} })) : [];
    return { data: { items, total: items.length }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const root = createRoot(document.getElementById('root'));
  const render = async (code, authenticated = true) => React.act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(AuthContext.Provider, { value: { user: { user_id: 1 }, isAuthenticated: authenticated } }, React.createElement(StockCommunity, { code })))));
  try {
    await render('005930');
    assert.equal(calls[0].size, 10);
    assert.equal(calls[0].symbol_code, '005930');
    assert.equal(document.querySelectorAll('li').length, 10);
    assert.equal(document.querySelector('header a').getAttribute('href'), '/community?symbol=005930');
    assert.equal(document.querySelector('li a').getAttribute('href'), '/community?symbol=005930&post=1');
    await render('000660');
    assert.equal(calls.at(-1).symbol_code, '000660');
    assert.equal(document.querySelectorAll('li').length, 0);
    assert(document.body.textContent.includes('아직 이 종목에 대한 글이 없어요.'));
    const count = calls.length;
    await render('005930', false);
    assert.equal(calls.length, count);
    assert.equal(document.querySelectorAll('li').length, 0);
    await render('');
    assert.equal(calls.length, count);
    assert(document.body.textContent.includes('종목을 선택하면 의견을 볼 수 있어요.'));
  } finally { await React.act(async () => root.unmount()); }
});
