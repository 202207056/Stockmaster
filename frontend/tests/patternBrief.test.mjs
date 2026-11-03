import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, CustomEvent: dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', envFile: false });
after(async () => { await server.close(); dom.window.close(); });
const { default: Card } = await server.ssrLoadModule('/src/components/ai/PatternBriefCard.jsx');
const { fetchPatternBrief } = await server.ssrLoadModule('/src/api/data.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const brief = () => ({ headline: '체결 기록을 돌아봅니다.', filled_count: 6, data_confidence: 'preliminary',
  observed_patterns: [{ title: '시장가 주문', evidence: '시장가 주문 비중이 높아요.' }],
  style_tags: [{ code: 'market_heavy', label: '시장가 위주' }],
  investment_style_description: '원금 손실을 최소화하며 안정적인 수익을 중시',
  style_comparison: { matches: [], differs: [{ code: 'market_heavy', text: '시장가 비중이 높아요.',
    note: { reason: '체결 가격을 미리 정할 수 없어요.', option: '지정가 주문은 가격을 정할 수 있어요.' } }] },
  limitations: ['기록이 적어요.'], disclaimer: '모의투자 연습용 설명이며 투자 권유가 아닙니다.' });
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
let root;
async function render(props = {}) {
  root ??= createRoot(container);
  await act(async () => root.render(React.createElement(Card, { accountId: 1, ...props })));
}
async function click() { await act(async () => container.querySelector('button').click()); }
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; client.clearToken();
  client.default.defaults.adapter = async () => assert.fail('Unexpected HTTP request');
});

test('manual POST sends integer account, authentication and renders public comparison notes', async () => {
  let calls = 0;
  client.setToken('pattern-test');
  client.default.defaults.adapter = async config => {
    calls++; assert.equal(config.method, 'post'); assert.equal(config.url, '/ai/pattern');
    assert.deepEqual(JSON.parse(config.data), { account_id: 1, profile: 'luna' });
    assert.equal(config.headers.Authorization, 'Bearer pattern-test');
    return response(config, brief());
  };
  await render({ accountId: '1' }); assert.equal(calls, 0);
  await click(); assert.equal(calls, 1);
  for (const text of ['체결 6건', '초기 표본', '시장가 위주', '투자성향과 다른 점', '체결 가격을 미리', '지정가 주문은', '기록이 적어요.', brief().disclaimer])
    assert(container.textContent.includes(text), text);
  await click(); assert.equal(calls, 2);
  await act(async () => window.dispatchEvent(new CustomEvent('orders:changed')));
  assert(!container.textContent.includes(brief().headline));
});

test('insufficient records, absent account and practice do not show a fabricated report', async () => {
  let calls = 0;
  client.default.defaults.adapter = async config => { calls++; return response(config, { status: 'insufficient', filled_count: 2 }); };
  await render({ practice: true }); assert.equal(container.querySelector('button'), null);
  await render({ accountId: null }); assert.equal(container.querySelector('button'), null);
  assert.equal(calls, 0);
  await render(); await click();
  assert.match(container.textContent, /3건 이상.*현재 2건/);
  assert(!container.textContent.includes('관찰된 매매 패턴'));
});

test('account change aborts pending request and cannot display old account result', async () => {
  let resolve, signal;
  client.default.defaults.adapter = config => { signal = config.signal; return new Promise(done => { resolve = () => done(response(config, brief())); }); };
  await render(); await click();
  assert.equal(container.querySelector('button').disabled, true);
  await render({ accountId: 2 }); assert.equal(signal.aborted, true);
  await act(async () => resolve());
  assert(!container.textContent.includes(brief().headline));
  assert.equal(container.querySelector('button').disabled, false);
});

test('invalid public payload and server failures show safe retry state', async () => {
  client.default.defaults.adapter = async config => response(config, { ...brief(), observed_patterns: [null] });
  await render(); await click(); assert(container.querySelector('[role="alert"]'));
  client.default.defaults.adapter = async () => { throw new Error('private provider details'); };
  await click(); assert(!container.textContent.includes('private provider'));
  client.default.defaults.adapter = async config => response(config, { ...brief(), style_comparison: null, investment_style_description: null });
  await click(); assert.equal(container.querySelector('[role="alert"]'), null);
  assert.match(container.textContent, /투자성향 설문/);
  await assert.rejects(fetchPatternBrief('invalid'));
  for (const data of [{ status: 'insufficient', filled_count: 3 }, { ...brief(), style_comparison: {} }, { ...brief(), data_confidence: 'unknown' }]) {
    client.default.defaults.adapter = async config => response(config, data);
    await assert.rejects(fetchPatternBrief(1));
  }
});
