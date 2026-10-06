import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div><button id="outside">outside</button>', { url: 'http://localhost/' });
const observers = new Set();
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class { constructor(fn) { this.fn = fn; observers.add(this); } observe() {} disconnect() { observers.delete(this); } } });
window.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom',
  define: { 'import.meta.env.VITE_ENABLE_ORDER_SUBMISSION': '"true"' } });
after(async () => { await server.close(); dom.window.close(); });
const { default: Tutorial } = await server.ssrLoadModule('/src/pages/MisuTutorial.jsx');
const { default: Trading } = await server.ssrLoadModule('/src/pages/Trading.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { estimateMisu } = await server.ssrLoadModule('/src/utils/misu.js');
const { portfolioTotals } = await server.ssrLoadModule('/src/api/normalize.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const visible = node => !node.closest('[hidden]');
const button = label => [...container.querySelectorAll('button')].find(node => visible(node) && node.textContent.trim() === label);
const click = async label => { assert(button(label), label); await React.act(async () => button(label).click()); };
const fillQuantity = async value => React.act(async () => {
  const input = [...container.querySelectorAll('[aria-label="수량"]')].find(visible);
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const finishExample = async () => {
  await click('미수거래'); await fillQuantity('4'); await click('모의 매수');
  await click('결제 날짜 비교하기'); await click('기한을 넘긴 경우 보기');
  assert(container.querySelector('.misu-tutorial-note').textContent.includes('20,156원'));
  await click('현금 주문과 비교 마무리');
};

test('margin includes the entire fee, and equity deducts debt but includes unsettled proceeds', () => {
  assert.deepEqual(estimateMisu(50000, 4, 100030), { gross: 200000, commission: 30, tax: 0, settlement: 200030, required: 100030, paid: 100030, shortfall: 100000 });
  assert.equal(estimateMisu(50000, 4, null), null);
  assert.equal(portfolioTotals({ withdrawable_cash: 0, misu_debt: 100000, pending_proceeds: 79844, holdings: [] }).total, -20156);
  assert.equal(portfolioTotals({ withdrawable_cash: 0, misu_debt: 'broken', holdings: [] }).total, null);
});

test('risk-first tutorial uses the current form, follows resizing, restores isolation and never calls an API', async () => {
  let requests = 0, closed = 0, enabled = 0;
  client.default.defaults.adapter = async () => { requests++; throw Error('No tutorial API calls'); };
  localStorage.setItem('gp_account_id', '999');
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Tutorial, { onClose: () => closed++, onEnable: () => enabled++ }))));
    assert(container.querySelector('.trading-order'));
    assert(container.querySelector('.misu-tutorial-note').textContent.includes('원금 초과 손실'));
    assert(document.getElementById('outside').inert);
    for (const observer of observers) observer.fn();
    window.dispatchEvent(new Event('resize'));
    assert(container.querySelector('.buy-tutorial-spotlight').style.width);
    await finishExample();
    await click('체험 종료 · 현금 유지');
    assert.equal(closed, 1); assert.equal(enabled, 0); assert.equal(requests, 0);
    assert.equal(localStorage.getItem('gp_account_id'), '999');
    assert(!container.textContent.includes('퀴즈'));
  } finally { await React.act(async () => root.unmount()); }
  assert(!document.getElementById('outside').inert);
});

function mockApi(writes) {
  client.setToken('misu-offline-test');
  client.default.defaults.adapter = async config => {
    let data;
    if (config.url === '/stocks') data = [{ symbol_code: '005930', name: '테스트' }];
    else if (config.url === '/stocks/005930') data = { symbol_code: '005930', name: '테스트' };
    else if (config.url.endsWith('/price')) data = { current_price: 50000 };
    else if (config.url.startsWith('/trading/misu/')) data = { debt: 0, pending_proceeds: 0, monitor_running: true, frozen_until: null, settlements: [] };
    else if (config.url === '/trading/orders' && config.method === 'post') {
      const payload = JSON.parse(config.data); writes.push(payload);
      data = { ...payload, order_id: 12, status: '체결', commission: 30, tax: 0 };
    } else if (config.url === '/trading/orders') data = [];
    else throw Object.assign(new Error('unavailable'), { response: { status: 404 }, config });
    return { data, status: 200, headers: {}, config };
  };
}

test('misu button intercepts first-buy tutorial in place, and only explicit confirmation sends a persisted order', async () => {
  const writes = []; mockApi(writes);
  const account = { account_id: 7, account_name: '계좌', withdrawable_cash: 100030 };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/trading?code=005930'] },
      React.createElement(AuthContext.Provider, { value: { isAuthenticated: true, user: { user_id: 901 }, accountId: 7, account, accounts: [account], refresh: async () => {} } }, React.createElement(Trading)))));
    const search = container.querySelector('[aria-label="종목명 또는 코드 검색"]');
    await click('미수거래');
    assert.equal(container.querySelector('[aria-label="종목명 또는 코드 검색"]'), search);
    assert(container.querySelector('[aria-label="미수거래 체험"]'));
    assert(!container.querySelector('[aria-label="연습 종료"]'));
    await finishExample();
    assert.equal(writes.length, 0);
    await click('위험 확인 · 미수 선택');
    assert(!container.querySelector('[aria-label="미수거래 체험"]'));
    assert.equal(container.querySelector('[aria-label="가격 종류"]').value, '시장가');
    assert(container.querySelector('[aria-label="실행 방식"]').disabled);
    assert(container.querySelector('.trading-order-maximum').textContent.includes('최대 4주'));
    await fillQuantity('4'); await click('모의 매수');
    assert.equal(writes.length, 0, 'review is not a submission');
    assert(container.querySelector('dialog').textContent.includes('예상 부족금 100,000원'));
    await click('매수주문');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].funding_type, '미수');
    assert.equal(writes[0].misu_risk_ack, true);
    assert.match(writes[0].client_request_id, /^[0-9a-f-]{36}$/);
    assert.equal(writes[0].account_id, 7);
    assert.equal(writes[0].quantity, 4);
  } finally { await React.act(async () => root.unmount()); }
});

test('closing and reopening the misu button repeats the tutorial without enabling margin', async () => {
  const writes = []; mockApi(writes);
  const account = { account_id: 8, account_name: '계좌', withdrawable_cash: 100030 };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/trading?code=005930'] },
      React.createElement(AuthContext.Provider, { value: { isAuthenticated: true, user: { user_id: 902 }, accountId: 8, account, accounts: [account], refresh: async () => {} } }, React.createElement(Trading)))));
    for (let i = 0; i < 2; i++) {
      await click('미수거래');
      await React.act(async () => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      assert(!container.querySelector('[aria-label="미수거래 체험"]'));
      assert(button('미수거래'));
    }
    assert.equal(writes.length, 0);
  } finally { await React.act(async () => root.unmount()); }
});
