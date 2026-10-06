import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom',
  define: { 'import.meta.env.VITE_ENABLE_ORDER_SUBMISSION': '"true"' } });
after(async () => { await server.close(); dom.window.close(); });
const { default: AutomationOrders } = await server.ssrLoadModule('/src/components/common/AutomationOrders.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const button = label => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label);
const setField = async (label, value) => React.act(async () => {
  const field = document.querySelector(`[aria-label="${label}"]`);
  if (field.tagName === 'SELECT') { field.value = value; field.dispatchEvent(new Event('change', { bubbles: true })); }
  else {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

for (const kind of ['scheduled', 'condition']) test(`${kind}: confirm, register, retry same key, list and cancel`, async () => {
  const sent = []; let job = null; let failFirstResponse = true;
  client.setToken(`test-${kind}`);
  client.default.defaults.adapter = async config => {
    let data;
    if (config.url.endsWith('/capabilities')) data = { enabled: true, last_cycle_at: new Date().toISOString() };
    else if (config.url.endsWith('/price')) data = { current_price: 50000 };
    else if (config.url.endsWith('/cancel')) { job.status = 'cancelled'; data = job; }
    else if (config.method === 'post') {
      const payload = JSON.parse(config.data); sent.push(payload);
      job ||= { ...payload, automation_id: 42, status: 'active', reason: '등록 완료' };
      if (failFirstResponse) { failFirstResponse = false; throw new Error('simulated lost response after commit'); }
      data = job;
    } else data = job ? [job] : [];
    return { data, status: 200, headers: {}, config };
  };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value: {
      isAuthenticated: true, user: { user_id: 1 }, accountId: 1, account: { account_name: '테스트 계좌' }, refresh: async () => {} } },
      React.createElement(AutomationOrders, { code: '005930' }))));
    if (kind === 'condition') { await setField('자동주문 등록 방식', 'condition'); await setField('감시 가격', '50000'); }
    await React.act(async () => button('예약·조건 내용 확인').click());
    assert.equal(sent.length, 0);
    assert(document.querySelector('[role="dialog"]').textContent.includes('등록은 체결이 아닙니다'));
    await React.act(async () => button('서버에 등록').click());
    assert(button('같은 등록 결과 확인'));
    await React.act(async () => button('같은 등록 결과 확인').click());
    assert.equal(sent.length, 2);
    assert.equal(sent[0].client_request_id, sent[1].client_request_id);
    assert.equal(sent[0].kind, kind);
    assert.equal(sent[0].account_id, 1);
    assert.equal(sent[0].symbol_code, '005930');
    assert(!document.querySelector('[role="dialog"]'));
    assert(document.body.textContent.includes(kind === 'condition' ? '감시중' : '예약대기'));
    await React.act(async () => button('등록 취소').click());
    assert.equal(job.status, 'cancelled');
    assert(!button('등록 취소'));
  } finally { await React.act(async () => root.unmount()); }
});

test('unsupported backend disables registration and describes required update', async () => {
  client.setToken('old-server');
  client.default.defaults.adapter = async config => { throw Object.assign(new Error('Not Found'), { response: { status: 404 }, config }); };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value: {
      isAuthenticated: true, user: { user_id: 1 }, accountId: 1, refresh: async () => {} } }, React.createElement(AutomationOrders, { code: '005930' }))));
    assert(button('예약·조건 내용 확인').disabled);
    assert(document.body.textContent.includes('아직 지원하지 않습니다'));
  } finally { await React.act(async () => root.unmount()); }
});
