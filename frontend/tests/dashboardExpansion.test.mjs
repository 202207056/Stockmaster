import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
for (const key of ['window', 'document', 'localStorage', 'CustomEvent']) globalThis[key] = dom.window[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.cancelAnimationFrame = () => {};
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { default: client } = await server.ssrLoadModule('/src/api/client.js');
client.defaults.adapter = async config => ({ config, status: 200, headers: {}, data:
  config.url === '/market/indices' ? [{ code: 'kospi', name: '코스피', value: 2650, change_rate: 1 }] :
  config.url.includes('/news') ? Array.from({ length: 6 }, (_, i) => ({ title: `News ${i}`, url: `https://example.com/${i}`, summary: 'Summary' })) :
  config.url.endsWith('/price') ? { current_price: 1000 } :
  /^\/stocks\//.test(config.url) ? { symbol_code: config.url.split('/')[2], name: 'Stock' } : [] });
const container = document.getElementById('root');
async function mount(path, route) {
  const { default: Component } = await server.ssrLoadModule(path);
  const { default: News } = await server.ssrLoadModule('/src/pages/News.jsx');
  const root = createRoot(container);
  await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value: { user: null, isAuthenticated: false } }, React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Routes, null,
    React.createElement(Route, { path: '/dashboard/news', element: React.createElement(News) }),
    React.createElement(Route, { path: '*', element: React.createElement(Component) }))))));
  return root;
}
async function toggle(id) {
  const button = container.querySelector(`[aria-controls="${id}"]`);
  assert.ok(button);
  await React.act(async () => button.click());
}
test('news title opens the full news page and home returns to three previews', async () => {
  const root = await mount('/src/pages/Dashboard.jsx', '/dashboard');
  try {
    assert.equal(container.querySelector('#dashboard-news').children.length, 3);
    assert.ok(container.querySelector('a[href="/trading?market=kospi"]'));
    assert.equal(container.querySelector('[aria-controls="dashboard-news"]'), null);
    await React.act(async () => container.querySelector('a[href="/dashboard/news"]').click());
    assert.equal(container.querySelector('[aria-label="오늘의 뉴스 전체 목록"]').children.length, 6);
    await React.act(async () => container.querySelector('a[href="/dashboard"]').click());
    assert.equal(container.querySelector('#dashboard-news').children.length, 3);
  } finally { await React.act(async () => root.unmount()); }
});
test('market detail has no order form and favorites expand only above five', async () => {
  localStorage.setItem('gp_favorites', JSON.stringify(['1', '2', '3', '4', '5', '6']));
  const root = await mount('/src/pages/Trading.jsx', '/trading?market=kospi');
  try {
    assert.ok(container.textContent.includes('코스피'));
    assert.ok(!container.querySelector('[aria-label="종목 주문"]'));
    assert.equal(container.querySelector('#trading-favorites').children.length, 5);
    await toggle('trading-favorites');
    assert.equal(container.querySelector('#trading-favorites').children.length, 6);
    await toggle('trading-favorites');
    assert.equal(container.querySelector('#trading-favorites').children.length, 5);
    await React.act(async () => {
      localStorage.setItem('gp_favorites', JSON.stringify(['1', '2', '3', '4', '5']));
      window.dispatchEvent(new CustomEvent('favorites:change'));
    });
    assert.equal(container.querySelector('[aria-controls="trading-favorites"]'), null);
  } finally { await React.act(async () => root.unmount()); }
});
