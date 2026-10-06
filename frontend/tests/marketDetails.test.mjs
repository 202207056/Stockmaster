import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: MarketDetails } = await server.ssrLoadModule('/src/components/common/MarketDetails.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { default: api } = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');

test('market tabs fetch only selected data, refresh, and clear data on symbol change', async () => {
  const calls = [];
  api.defaults.adapter = async config => {
    calls.push(config.url);
    let data;
    if (config.url.endsWith('/orderbook')) data = { asks: [{ level: 1, price: 50100, quantity: 12 }], bids: [{ level: 1, price: 50000, quantity: 20 }], market_time: '10:15:30' };
    else if (config.url.endsWith('/trades')) data = { rows: [{ time: '10:15:30', price: 50100, quantity: 7 }] };
    else data = [{ date: '20261005', open: 50000, high: 51000, low: 49000, close: 50000, volume: 100 }, { date: '20261006', open: 50000, high: 52000, low: 49000, close: 51000, volume: 200 }];
    return { data, status: 200, headers: {}, config };
  };
  const root = createRoot(container);
  const render = code => React.createElement(AuthContext.Provider, { value: { user: null } }, React.createElement(MarketDetails, { code, key: code }));
  try {
    await React.act(async () => root.render(render('005930')));
    assert.deepEqual(calls, ['/stocks/005930/orderbook']);
    assert.match(container.textContent, /50,100/);
    const select = async label => React.act(async () => [...container.querySelectorAll('[role="tab"]')].find(el => el.textContent === label).click());
    await select('체결');
    assert.match(container.textContent, /체결량/);
    assert.equal(calls.at(-1), '/stocks/005930/trades');
    await select('일별');
    assert.match(container.textContent, /\+2.00%/);
    assert.equal(calls.at(-1), '/stocks/005930/chart');
    const before = calls.length;
    await React.act(async () => container.querySelector('[aria-label="일별 새로고침"]').click());
    assert.equal(calls.length, before + 1);
    await React.act(async () => root.render(render('')));
    assert.match(container.textContent, /종목을 선택/);
    assert.doesNotMatch(container.textContent, /51,000/);
  } finally { await React.act(async () => root.unmount()); }
});

test('unavailable market data shows a retry without fabricated rows', async () => {
  api.defaults.adapter = async config => { throw Object.assign(new Error('Unavailable'), { config, response: { status: 503, data: { detail: '시장 조회 불가' } }, isAxiosError: true }); };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value: { user: null } }, React.createElement(MarketDetails, { code: '005930' }))));
    assert(container.querySelector('[role="alert"]'));
    assert.equal(container.querySelectorAll('tbody tr').length, 0);
    assert.match(container.textContent, /다시 시도/);
  } finally { await React.act(async () => root.unmount()); }
});
