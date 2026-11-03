import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', envFile: false });
const { default: Rankings } = await server.ssrLoadModule('/src/pages/Rankings.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { default: client, clearRequestCache } = await server.ssrLoadModule('/src/api/client.js');
const { fetchRanking } = await server.ssrLoadModule('/src/api/data.js');
const rows = Array.from({ length: 30 }, (_, i) => ({ rank: i + 1, symbol_code: String(i + 1).padStart(6, '0'), name: `순위종목 ${i + 1}`, price: 12000 + i, change_rate: i === 0 ? -1.25 : i === 1 ? 0 : null, amount: i === 0 ? null : 123456789, volume: i === 0 ? 0 : 123456, market_cap: i === 0 ? 417884778500000 : null, volume_increase_rate: i === 0 ? 1234.56 : i === 1 ? 0 : null }));
let root;
const requests = [];
let fail = false;
client.defaults.adapter = async config => {
  if (config.url.includes('/ranking/')) {
    requests.push({ url: config.url, limit: config.params.limit });
    if (fail) throw new Error('ranking unavailable');
    return { config, status: 200, statusText: 'OK', headers: {}, data: rows.slice(0, config.params.limit).map(row => ({ ...row, name: `${config.url.endsWith('/volume') ? '거래량' : '순위'}종목 ${row.rank}` })) };
  }
  return { config, status: 200, statusText: 'OK', headers: {}, data: {} };
};
function Location() { return React.createElement('output', null, useLocation().search); }
async function mount(path = '/dashboard/rankings?type=amount') {
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(AuthContext.Provider, { value: { user: null, isLoading: false } },
    React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(Rankings), React.createElement(Location)))));
}
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; localStorage.clear(); clearRequestCache(); requests.length = 0; fail = false; });
after(async () => { await server.close(); dom.window.close(); });

test('overview keeps default limit; full ranking requests 30 and shows zero/missing values honestly', async () => {
  await fetchRanking('amount');
  assert.equal(requests[0].limit, 10);
  await mount();
  assert.equal(requests.at(-1).limit, 30);
  assert.equal(document.querySelectorAll('tbody tr').length, 30);
  const first = document.querySelector('tbody tr');
  assert.match(first.textContent, /12,000원/);
  assert.match(first.textContent, /-1.25%/);
  assert.match(first.textContent, /0주/);
  assert.match(first.textContent, /—/);
  assert.match(document.querySelectorAll('tbody tr')[1].textContent, /0.00%/);
  const last = document.querySelectorAll('tbody tr')[29];
  assert.match(last.textContent, /순위종목 30/);
  assert.equal(last.querySelector('a').getAttribute('href'), '/trading?code=000030');
});

test('category links load their ranking without the removed filter', async () => {
  await mount('/dashboard/rankings?type=change');
  assert.equal(requests.at(-1).url, '/stocks/ranking/change');
  await act(async () => document.querySelector('nav a[href$="volume"]').click());
  assert.equal(requests.at(-1).url, '/stocks/ranking/volume');
  assert.equal(document.querySelector('nav a[aria-current]').textContent, '인기 종목');
  assert.match(document.querySelector('tbody').textContent, /거래량종목 30/);
  assert.equal(document.querySelector('select'), null);
  assert.equal(document.querySelectorAll('tbody tr').length, 30);
});

test('unknown category uses amount; errors can retry without invented rows', async () => {
  fail = true;
  await mount('/dashboard/rankings?type=unknown');
  assert.equal(requests.at(-1).url, '/stocks/ranking/amount');
  assert.equal(document.querySelector('tbody'), null);
  fail = false;
  await act(async () => document.querySelector('[aria-label="순위 새로고침"]').click());
  assert.equal(document.querySelectorAll('tbody tr').length, 30);
});

test('additional ranking tabs request their own API and display category-specific metrics', async () => {
  await mount();
  assert.equal(document.querySelectorAll('nav a').length, 6);
  for (const [id, heading, expected] of [
    ['decline', '거래대금', '—'],
    ['market_cap', '시가총액', '4,178,847.79억원'],
    ['volume_surge', '거래량 증가율', '1,234.56%'],
  ]) {
    await act(async () => document.querySelector(`nav a[href$="${id}"]`).click());
    assert.equal(requests.at(-1).url, `/stocks/ranking/${id}`);
    assert.equal(document.querySelectorAll('thead th')[3].textContent, heading);
    assert.equal(document.querySelectorAll('tbody tr:first-child td')[2].textContent, expected);
    assert.equal(document.querySelectorAll('tbody tr').length, 30);
  }
  assert.equal(document.querySelectorAll('tbody tr:nth-child(2) td')[2].textContent, '0.00%');
  assert.equal(document.querySelectorAll('tbody tr:nth-child(3) td')[2].textContent, '—');
});
