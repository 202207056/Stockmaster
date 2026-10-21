import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, CustomEvent: dom.window.CustomEvent,
  IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: Card } = await server.ssrLoadModule('/src/components/ai/PortfolioBriefCard.jsx');
const { default: Assets } = await server.ssrLoadModule('/src/pages/Assets.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { fetchPortfolioBrief } = await server.ssrLoadModule('/src/api/data.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const holdings = [
  { symbol_code: '005930', security_name: '테스트전자', hold_quantity: 10, avg_price: 50000 },
  { symbol_code: '000660', security_name: '테스트반도체', hold_quantity: 2, avg_price: 80000 },
];
const sectionKeys = ['current_status', 'entry_context', 'position_summary', 'recent_issues',
  'positive_factors', 'risk_factors', 'watch_points', 'limitations'];
function brief(code = '005930', headline = '객관적인 보유 정보') {
  return { symbol_code: code, security_name: null, headline,
    ...Object.fromEntries(sectionKeys.map(key => [key, [`${key} 설명`]])),
    disclaimer: '모의투자 연습용 설명이며 투자 권유가 아닙니다.' };
}
function response(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} }; }
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const button = () => container.querySelector('button');
async function click() { await act(async () => button().click()); }
async function select(code) {
  await act(async () => {
    const control = container.querySelector('select');
    control.value = code;
    control.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}
let root;
async function render(props = {}) {
  root ??= createRoot(container);
  await act(async () => root.render(React.createElement(Card, { accountId: 7, holdings, ...props })));
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  client.clearToken();
  client.default.defaults.adapter = async () => { throw new Error('Unexpected HTTP attempt'); };
});

// Every HTTP request in this file is intercepted by an in-memory Axios adapter.
test('helper uses Backend path, encoded symbol, account, explicit/default Luna, signal and no GET cache', async () => {
  let calls = 0;
  const controller = new AbortController();
  client.default.defaults.adapter = async config => {
    calls++;
    assert.equal(config.url, '/ai/portfolio-brief/A%2FB%20C');
    assert.deepEqual(config.params, { account_id: 7, profile: 'luna' });
    assert.equal(config.signal, controller.signal);
    assert.equal(config.cache, false);
    return response(config, brief('A/B C'));
  };
  await fetchPortfolioBrief(7, 'A/B C', controller.signal);
  await fetchPortfolioBrief(7, 'A/B C', controller.signal, 'luna');
  assert.equal(calls, 2, 'manual re-run bypasses cached responses');
});

test('helper rejects malformed top-level, malformed sections and wrong-stock responses', async () => {
  for (const data of [null, [], { detail: 'unavailable' }, { ...brief(), entry_context: {} },
    { ...brief(), current_status: [] }, { ...brief(), headline: ' ' }, brief('000660')]) {
    client.default.defaults.adapter = async config => response(config, data);
    await assert.rejects(fetchPortfolioBrief(7, '005930'));
  }
});

test('no account, empty holdings and practice never request AI', async () => {
  client.default.defaults.adapter = async () => assert.fail('Must not request');
  await render({ accountId: null });
  assert.match(container.textContent, /계좌를 선택해 주세요/);
  assert.equal(button(), null);
  await render({ holdings: [] });
  assert.match(container.textContent, /보유종목이 생기면/);
  await render({ practice: true });
  assert.match(container.textContent, /연습모드에서는/);
  assert.equal(button(), null);
});

test('render and stock selection are lazy; click is one request with duplicate prevention and ordered sections', async () => {
  const pending = deferred();
  let calls = 0;
  client.default.defaults.adapter = async config => {
    calls++;
    assert.equal(config.url, '/ai/portfolio-brief/000660');
    assert.deepEqual(config.params, { account_id: 7, profile: 'luna' });
    return pending.promise.then(data => response(config, data));
  };
  await render();
  assert.equal(calls, 0);
  assert.equal(container.querySelector('label').htmlFor, container.querySelector('select').id);
  assert.match(container.querySelector('option').textContent, /테스트전자/);
  await select('000660');
  assert.equal(calls, 0);
  await click();
  assert.equal(calls, 1);
  assert(button().disabled);
  assert.match(container.querySelector('[role="status"]').textContent, /생성하고/);
  await click();
  assert.equal(calls, 1);
  await act(async () => pending.resolve(brief('000660')));
  assert(!button().disabled);
  assert.equal(button().textContent, 'AI 브리핑 다시 보기');
  assert.deepEqual([...container.querySelectorAll('h4')].map(item => item.textContent), [
    '현재 상태', '포지션 시작 당시 가격 상황', '보유 흐름', '최근 확인되는 이슈',
    '긍정적으로 볼 수 있는 요인', '주의해서 볼 요인', '앞으로 확인할 점', '데이터 안내',
  ]);
  assert.match(container.textContent, /모의투자 연습용 설명이며 투자 권유가 아닙니다\./);
  assert.doesNotMatch(container.textContent, /매수 당시 뉴스|진입 당시 뉴스/);
});

test('empty sections are hidden and raw execution metadata is never rendered', async () => {
  const data = { ...brief(), entry_context: [], recent_issues: [], limitations: [],
    model: 'INTERNAL_MODEL', provider: 'INTERNAL_PROVIDER', reasoning: 'INTERNAL_REASONING' };
  client.default.defaults.adapter = async config => response(config, data);
  await render();
  await click();
  assert.doesNotMatch(container.textContent, /포지션 시작 당시 가격 상황|최근 확인되는 이슈|데이터 안내|INTERNAL_/);
  assert.match(container.textContent, /현재 상태/);
});

test('failure is card-local, hides raw details and supports explicit retry', async () => {
  let calls = 0;
  client.default.defaults.adapter = async config => {
    if (++calls === 1) throw Object.assign(new Error('PRIVATE_ENDPOINT INTERNAL_SECRET'), {
      config, response: { status: 502, data: { detail: 'INTERNAL_SECRET' } },
    });
    return response(config, brief());
  };
  await render();
  await click();
  assert.match(container.querySelector('[role="alert"]').textContent, /AI 브리핑을 불러오지 못했어요/);
  assert.doesNotMatch(container.textContent, /PRIVATE_ENDPOINT|INTERNAL_SECRET/);
  await click();
  assert.equal(calls, 2);
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.match(container.textContent, /객관적인 보유 정보/);
});

test('account and symbol changes clear completed results/errors without automatic calls', async () => {
  let calls = 0;
  client.default.defaults.adapter = async config => {
    calls++;
    return response(config, brief(config.url.split('/').at(-1), 'PREVIOUS_BRIEF'));
  };
  await render();
  await click();
  assert.match(container.textContent, /PREVIOUS_BRIEF/);
  await select('000660');
  assert.doesNotMatch(container.textContent, /PREVIOUS_BRIEF/);
  await click();
  await render({ accountId: 8 });
  assert.equal(container.querySelector('select').value, '005930');
  assert.doesNotMatch(container.textContent, /PREVIOUS_BRIEF/);
  assert.equal(calls, 2);
  client.default.defaults.adapter = async () => { calls++; throw new Error('offline'); };
  await click();
  assert(container.querySelector('[role="alert"]'));
  await render({ accountId: 9 });
  assert.equal(container.querySelector('[role="alert"]'), null);
  await click();
  await select('000660');
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.equal(calls, 4);
});

for (const change of ['account', 'symbol', 'removed holding', 'unmount']) {
  test(`${change} aborts in-flight request and late completion cannot overwrite new state`, async () => {
    const pending = deferred();
    let oldSignal;
    let calls = 0;
    client.default.defaults.adapter = async config => {
      if (++calls === 1) {
        oldSignal = config.signal;
        return pending.promise.then(data => response(config, data));
      }
      return response(config, brief(config.url.split('/').at(-1), 'CURRENT_BRIEF'));
    };
    await render();
    if (change === 'removed holding') await select('000660');
    await click();
    if (change === 'account') await render({ accountId: 8 });
    if (change === 'symbol') await select('000660');
    if (change === 'removed holding') await render({ holdings: [holdings[0]] });
    if (change === 'unmount') { await act(async () => root.unmount()); root = null; }
    assert(oldSignal.aborted);
    if (change !== 'unmount') {
      assert.equal(container.querySelector('[role="alert"]'), null);
      await click();
      assert.match(container.textContent, /CURRENT_BRIEF/);
    }
    await act(async () => pending.resolve(brief('005930', 'STALE_BRIEF')));
    assert.doesNotMatch(container.textContent, /STALE_BRIEF/);
    assert.equal(container.querySelector('[role="alert"]'), null);
    assert.equal(calls, change === 'unmount' ? 1 : 2);
  });
}

test('holdings refresh removing selected stock resets selection and clears completed briefing', async () => {
  client.default.defaults.adapter = async config => response(config, brief('000660', 'REMOVED_BRIEF'));
  await render();
  await select('000660');
  await click();
  assert.match(container.textContent, /REMOVED_BRIEF/);
  await render({ holdings: [holdings[0]] });
  assert.equal(container.querySelector('select').value, '005930');
  assert.doesNotMatch(container.textContent, /REMOVED_BRIEF/);
  await render({ holdings: [] });
  assert.equal(button(), null);
});

test('Assets keeps holdings and totals on briefing failure; anonymous view has no extra login prompt', async () => {
  localStorage.setItem('stockmaster:tutorials-enabled', 'false');
  client.setToken('fixture-session');
  let aiCalls = 0;
  client.default.defaults.adapter = async config => {
    if (config.url === '/trading/portfolio') return response(config, { holdings, withdrawable_cash: 100000 });
    if (config.url.endsWith('/price')) return response(config, { current_price: 60000 });
    assert.match(config.url, /^\/ai\/portfolio-brief\//);
    aiCalls++;
    throw Object.assign(new Error('PRIVATE_ERROR'), { config, response: { status: 503 } });
  };
  const auth = { user: { user_id: 1 }, accountId: 7, account: { account_id: 7, account_name: '테스트계좌', withdrawable_cash: 100000 },
    accounts: [{ account_id: 7, account_name: '테스트계좌' }], isAuthenticated: true };
  root = createRoot(container);
  const renderAssets = value => act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(AuthContext.Provider, { value }, React.createElement(Assets)))));
  await renderAssets(auth);
  assert.equal(aiCalls, 0);
  const tableBefore = container.querySelector('table').textContent;
  const totalBefore = container.querySelector('[data-assets-tour="total"]').textContent;
  await act(async () => [...container.querySelectorAll('button')].find(item => item.textContent === 'AI 브리핑 보기').click());
  assert.equal(aiCalls, 1);
  assert(container.querySelector('[role="alert"]'));
  assert.equal(container.querySelector('table').textContent, tableBefore);
  assert.equal(container.querySelector('[data-assets-tour="total"]').textContent, totalBefore);
  assert.doesNotMatch(container.textContent, /PRIVATE_ERROR/);
  await renderAssets({ ...auth, user: null, accounts: [], accountId: null, account: null, isAuthenticated: false });
  assert.doesNotMatch(container.textContent, /AI 보유종목 브리핑/);
});
