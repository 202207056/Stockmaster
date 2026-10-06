import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
const observedResize = new Set();
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  MutationObserver: dom.window.MutationObserver, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class { constructor(callback) { this.callback = callback; observedResize.add(this); } observe() {} disconnect() { observedResize.delete(this); } } });
dom.window.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom',
  define: { 'import.meta.env.VITE_ENABLE_ORDER_SUBMISSION': '"true"' } });
after(async () => { await server.close(); dom.window.close(); });
const { default: Tutorial } = await server.ssrLoadModule('/src/pages/BuyTutorial.jsx');
const { default: SitePractice } = await server.ssrLoadModule('/src/components/learn/SitePractice.jsx');
const { default: Trading } = await server.ssrLoadModule('/src/pages/Trading.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const types = await server.ssrLoadModule('/src/utils/orderTypes.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const button = label => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label);
const click = async label => { assert(button(label), label); await React.act(async () => button(label).click()); };
const select = async (label, value) => React.act(async () => {
  const el = container.querySelector(`select[aria-label="${label}"]`);
  assert(el, label); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true }));
});

test('inline buy tutorial completes with no API requests or account storage access, uses current form, fees and mastery', async () => {
  localStorage.clear();
  localStorage.setItem('gp_account_id', '999');
  client.setToken('test-token-must-not-be-used');
  let calls = 0;
  client.default.defaults.adapter = async () => { calls++; throw new Error('Tutorial must not call APIs'); };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/trading?practice=buy'] }, React.createElement(Tutorial, { onClose: () => {} }))));
    assert(container.querySelector('.trading-order'));
    assert(!container.textContent.includes('999'));
    assert(!container.querySelector('.buy-tutorial-header, .buy-tutorial-stock, .buy-tutorial-guide'));
    assert(!button('다음'));
    assert(container.querySelector('.buy-tutorial-note').textContent.includes('계좌 선택'));
    await select('계좌', '2');
    assert(container.querySelector('.buy-concept-dialog').textContent.includes('50,100'));
    await click('시장가부터 체험하기');
    await select('가격 종류', '시장가');
    await click('모의 매수');
    assert(container.querySelector('.buy-concept-result').textContent.includes('50,100원에 가상 체결'));
    await click('같은 시세에서 지정가 체험하기');
    await select('가격 종류', '지정가');
    await React.act(async () => {
      const input = container.querySelector('[aria-label="지정가 (원)"]');
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '50000');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('모의 매수');
    assert(container.querySelector('.buy-concept-result').textContent.includes('미체결'));
    assert(button('다른 주문유형도 살펴보기').disabled);
    await click('매도 호가를 49,900원으로 내려 보기');
    assert(container.querySelector('.buy-concept-result').textContent.includes('49,900원에 가상 체결'));
    await click('시장가로 주문');
    assert(button('다른 주문유형도 살펴보기').disabled);
    await click('50,000원 지정가로 주문');
    await click('다른 주문유형도 살펴보기');
    assert(container.querySelector('.trading-order-balance').textContent.includes('1,000,000'), 'comparison trades do not debit the practice account');
    await select('가격 종류', '중간가');
    await click('모의 매수');
    assert(button('최유리지정가 체험하기').disabled);
    await click('양쪽 호가를 200원 올려 보기');
    assert(container.querySelector('.buy-concept-dialog').textContent.includes('50,200원'));
    await click('처음 가격에 계속 고정돼요');
    assert(button('최유리지정가 체험하기').disabled);
    await click('양쪽 호가에 따라 달라져요');
    await click('최유리지정가 체험하기');
    await select('가격 종류', '최유리지정가');
    await click('모의 매수');
    assert(container.querySelector('.buy-concept-result').textContent.includes('50,100원에 가상 체결'));
    await click('체결 전에 매도 호가가 올라간 경우 보기');
    assert(container.querySelector('.buy-concept-result').textContent.includes('미체결'));
    await click('새 매도 호가까지 따라 올라가요');
    assert(button('최우선지정가 체험하기').disabled);
    await click('접수한 50,100원에 남아요');
    await click('최우선지정가 체험하기');
    await select('가격 종류', '최우선지정가');
    await click('모의 매수');
    assert(container.querySelector('.buy-concept-result').textContent.includes('대기'));
    await click('다른 매수자가 50,000원을 제시하면?');
    assert(button('수량과 비용 배우기').disabled);
    await click('앞선 주문이 모두 소진된 뒤 49,900원 매도 1주 만나기');
    assert(container.querySelector('.buy-concept-result').textContent.includes('49,900원에 가상 체결'));
    await click('둘 다 가장 낮은 매도 호가');
    assert(button('수량과 비용 배우기').disabled);
    await click('최유리는 매도, 최우선은 매수 호가');
    await click('수량과 비용 배우기');
    assert(container.querySelector('.trading-order-balance').textContent.includes('1,000,000'));
    await select('가격 종류', '시장가');
    assert(container.querySelector('.buy-tutorial-note').textContent.includes('수량 입력'));
    await React.act(async () => container.querySelector('[aria-label="수량 늘리기"]').click());
    assert(container.querySelector('.buy-tutorial-note').textContent.includes('수수료 확인'));
    await React.act(async () => container.querySelector('[aria-label="예상 비용 계산 내역"]').click());
    assert(container.querySelector('#tutorial-trading-order-costs').textContent.includes('100,015'));
    assert(!container.querySelector('.trading-order').textContent.includes('모의 시장가는 서버'));
    assert(button('비용 확인하고 주문하기').disabled);
    await click('주식값이 있으니 살 수 있어요');
    assert(button('비용 확인하고 주문하기').disabled);
    await click('수수료 15원이 부족해요');
    await click('비용 확인하고 주문하기');
    await click('모의 매수');
    assert(container.querySelector('dialog[open]').textContent.includes('100,015'));
    await click('매수주문');
    assert(!button('매수주문'));
    assert(container.textContent.includes('899,985'));
    await click('확인');
    assert(types.hasCompletedBuyTutorial());
    assert.equal(localStorage.getItem('gp_account_id'), '999');
    assert.equal(calls, 0);
  } finally { await React.act(async () => root.unmount()); }
});

test('first purchase interaction is intercepted; no real order; completion markers are per user', async () => {
  const account = { account_id: 7, account_name: '계좌', withdrawable_cash: 1000000 };
  let writes = 0;
  client.default.defaults.adapter = async config => {
    if (config.method !== 'get') writes++;
    let data;
    if (config.url === '/stocks') data = [{ symbol_code: '005930', name: '종목' }];
    else if (config.url === '/stocks/005930') data = { symbol_code: '005930', name: '종목' };
    else if (config.url.endsWith('/price')) data = { current_price: 50000 };
    else if (config.url === '/trading/orders') data = [];
    else throw Object.assign(new Error('unavailable'), { response: { status: 404 }, config });
    return { data, status: 200, headers: {}, config };
  };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/normal?code=005930'] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/normal', element: React.createElement(AuthContext.Provider, { value: { isAuthenticated: true, user: { user_id: 42 }, accountId: 7, account, accounts: [account], refresh: async () => {} } }, React.createElement(Trading)) }),
        React.createElement(Route, { path: '/trading', element: React.createElement(Tutorial) })))));
    const originalForm = container.querySelector('.trading-order');
    const originalSearch = container.querySelector('[aria-label="종목명 또는 코드 검색"]');
    const originalQuantity = originalForm.querySelector('[aria-label="수량"]').value;
    await click('모의 매수');
    assert.equal(container.querySelector('[aria-label="종목명 또는 코드 검색"]'), originalSearch, 'Trading stays mounted at the same route');
    assert(originalForm.closest('[hidden]'), 'original form is preserved but hidden');
    assert(container.querySelector('.buy-tutorial-inline'));
    assert.equal(originalSearch.closest('aside').inert, true);
    assert(container.querySelector('.buy-tutorial-note').textContent.includes('계좌 선택'));
    await React.act(async () => container.querySelector('[aria-label="연습 종료"]').click());
    assert(!container.querySelector('.buy-tutorial-inline'));
    assert.equal(container.querySelector('.trading-order'), originalForm);
    assert(!originalForm.closest('[hidden]'));
    assert(!originalSearch.closest('aside').inert);
    assert.equal(originalForm.querySelector('[aria-label="수량"]').value, originalQuantity);
    assert.equal(writes, 0);
    assert.notEqual(types.buyTutorialKey(42), types.buyTutorialKey(43));
    assert(!types.hasCompletedBuyTutorial(types.buyTutorialKey(42)));
  } finally { await React.act(async () => root.unmount()); }
});

test('all order types resolve by side and missing/crossed quotes never become fabricated prices', () => {
  const book = { bid: 49900, ask: 50100 };
  assert.equal(types.resolveOrderPrice('최유리지정가', '매수', 1, 50000, book), 50100);
  assert.equal(types.resolveOrderPrice('최우선지정가', '매수', 1, 50000, book), 49900);
  assert.equal(types.resolveOrderPrice('최유리지정가', '매도', 1, 50000, book), 49900);
  assert.equal(types.resolveOrderPrice('최우선지정가', '매도', 1, 50000, book), 50100);
  assert.equal(types.resolveOrderPrice('중간가', '매수', 1, 50000, book), 50000);
  assert.equal(types.resolveOrderPrice('중간가', '매수', 1, 50000, null), null);
  assert.equal(types.resolveOrderPrice('중간가', '매수', 1, 50000, { bid: 50100, ask: 49900 }), null);
});

test('scheduled and conditional orders share the purchase form and never submit an immediate order', async () => {
  localStorage.setItem(types.buyTutorialKey(44), 'true');
  const account = { account_id: 7, account_name: '공통 계좌', withdrawable_cash: 1000000 };
  const posts = [];
  client.default.defaults.adapter = async config => {
    let data;
    if (config.url === '/stocks') data = [{ symbol_code: '005930', name: '종목' }];
    else if (config.url === '/stocks/005930') data = { symbol_code: '005930', name: '종목' };
    else if (config.url.endsWith('/price')) data = { current_price: 50000 };
    else if (config.url.endsWith('/capabilities')) data = { enabled: true };
    else if (config.url === '/trading/automations' && config.method === 'post') {
      const payload = JSON.parse(config.data); posts.push(payload);
      data = { ...payload, automation_id: posts.length, status: 'active' };
    } else if (config.url === '/trading/automations' || config.url === '/trading/orders') {
      assert.equal(config.method, 'get', 'immediate order must not be submitted'); data = [];
    } else throw Object.assign(new Error('unavailable'), { response: { status: 404 }, config });
    return { data, status: 200, headers: {}, config };
  };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/trading?code=005930'] },
      React.createElement(AuthContext.Provider, { value: { isAuthenticated: true, user: { user_id: 44 }, accountId: 7, account, accounts: [account], refresh: async () => {} } }, React.createElement(Trading)))));
    assert(!container.querySelector('[aria-label="예약·조건 설정"]'));
    await React.act(async () => container.querySelector('[aria-label="수량 늘리기"]').click());
    for (const mode of ['scheduled', 'condition']) {
      await select('실행 방식', mode);
      assert(!container.querySelector('[aria-label="자동주문 수량"]'));
      assert(!container.querySelector('[aria-label="자동주문 매매 구분"]'));
      assert.equal(container.querySelector('select[aria-label="가격 종류"]').value, '시장가');
      assert(container.querySelector('select[aria-label="가격 종류"]').disabled);
      if (mode === 'condition') await React.act(async () => {
        const input = container.querySelector('[aria-label="감시 가격"]');
        Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '50000');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const before = posts.length;
      await click('예약·조건 내용 확인');
      assert.equal(posts.length, before);
      assert(!container.querySelector('dialog'), 'regular order confirmation must not bubble from embedded form');
      assert(container.querySelector('.trading-order-fields').disabled);
      await click('서버에 등록');
      assert.equal(posts.length, before + 1);
      assert.equal(posts.at(-1).kind, mode);
      assert.equal(posts.at(-1).quantity, 2);
      assert.equal(posts.at(-1).account_id, 7);
      assert.equal(posts.at(-1).order_type, '매수');
    }
  } finally { await React.act(async () => root.unmount()); }
});

test('learning replay opens inside Trading and Escape closes only the overlay, retaining query and history location', async () => {
  client.setToken(null);
  client.default.defaults.adapter = async config => ({ data: [], status: 200, headers: {}, config });
  const Location = () => { const location = useLocation(); return React.createElement('output', { 'data-location': true }, location.pathname + location.search); };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/trading?practice=buy&search=hello'] },
      React.createElement(AuthContext.Provider, { value: { isAuthenticated: false } },
        React.createElement(Location),
        React.createElement(SitePractice, { inlineBuy: true }, React.createElement(Trading))))));
    assert(container.querySelector('.buy-tutorial-inline'));
    assert(container.querySelector('[aria-label="종목명 또는 코드 검색"]'));
    assert.equal(container.querySelector('[data-location]').textContent, '/trading?practice=buy&search=hello');
    await React.act(async () => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert(!container.querySelector('.buy-tutorial-inline'));
    assert.equal(container.querySelector('[data-location]').textContent, '/trading?search=hello');
  } finally { await React.act(async () => root.unmount()); }
});


test('spotlight and callout recalculate from target bounds after form resize without restarting the lesson', async () => {
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(Tutorial, { onClose: () => {} })));
    const target = container.querySelector('[data-tutorial-target="account"]');
    const note = container.querySelector('.buy-tutorial-note');
    const outline = container.querySelector('.buy-tutorial-spotlight');
    let bounds = { left: 600, top: 300, right: 800, bottom: 340, width: 200, height: 40 };
    target.getBoundingClientRect = () => bounds;
    note.getBoundingClientRect = () => ({ width: 300, height: 120 });
    await React.act(async () => window.dispatchEvent(new Event('resize')));
    assert.equal(outline.style.left, '595px');
    assert.equal(outline.style.width, '210px');
    assert.equal(note.style.left, '282px');
    bounds = { left: 100, top: 200, right: 420, bottom: 280, width: 320, height: 80 };
    await React.act(async () => { for (const observer of observedResize) observer.callback(); });
    assert.equal(outline.style.left, '95px');
    assert.equal(outline.style.width, '330px');
    assert.equal(outline.style.height, '90px');
    assert.equal(note.style.left, '438px');
    assert(note.textContent.includes('계좌 선택'));
  } finally { await React.act(async () => root.unmount()); }
  assert.equal(observedResize.size, 0, 'resize observers are cleaned up');
});
