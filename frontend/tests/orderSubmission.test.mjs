import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement,
  Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class { observe() {} disconnect() {} } });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom',
  define: { 'import.meta.env.VITE_ENABLE_ORDER_SUBMISSION': '"true"' } });
after(async () => { await server.close(); dom.window.close(); });
const { default: Trading } = await server.ssrLoadModule('/src/pages/Trading.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const button = label => [...container.querySelectorAll('button')].find(el => el.textContent.trim() === label);

test('buy reaches confirmation and completion without a fee policy', async () => {
  const orders = [];
  let refreshes = 0;
  const account = { account_id: 7, account_name: '테스트', withdrawable_cash: 1000000 };
  client.setToken('local-test-only');
  client.default.defaults.adapter = async config => {
    let data;
    const url = config.url;
    assert(!url.includes('cost-policy') && url !== '/openapi.json', 'orders need no cost-policy lookup');
    if (url === '/stocks') data = [{ symbol_code: '005930', name: '삼성전자' }];
    else if (url === '/stocks/005930') data = { symbol_code: '005930', name: '삼성전자' };
    else if (url.endsWith('/price')) data = { current_price: 50000 };
    else if (url === '/trading/orders' && config.method === 'post') {
      const payload = JSON.parse(config.data);
      orders.push(payload);
      data = { ...payload, order_id: 123, status: '체결' };
    } else if (url === '/trading/orders') data = [];
    else throw Object.assign(new Error('Not Found'), { response: { status: 404 }, config, isAxiosError: true });
    return { data, status: 200, headers: {}, config };
  };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/trading?code=005930'] },
      React.createElement(AuthContext.Provider, { value: { status: 'authenticated', isAuthenticated: true,
        user: { user_id: 1 }, accountId: 7, account, accounts: [account], refresh: async () => { refreshes++; } } }, React.createElement(Trading)))));
    assert(button('모의 매수'));
    assert.equal(button('모의 매수').disabled, false);
    await React.act(async () => button('모의 매수').click());
    assert(container.querySelector('dialog[open]'));
    assert.equal(orders.length, 0, 'confirmation must precede submission');
    await React.act(async () => button('매수주문').click());
    assert.equal(orders.length, 1);
    assert.equal(orders[0].account_id, 7);
    assert.equal(orders[0].quantity, 1);
    assert.equal(orders[0].cost_policy_version, undefined);
    assert(container.querySelector('dialog').textContent.includes('주문 완료!'));
    assert.equal(refreshes, 1);
    assert(!button('매수주문'), 'completed order cannot be submitted again');
  } finally { await React.act(async () => root.unmount()); }
});
