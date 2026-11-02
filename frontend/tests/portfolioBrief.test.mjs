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
const { CACHE_STORAGE_KEY, resourceKey } = await server.ssrLoadModule('/src/api/resourceCache.js');
const container = document.getElementById('root');
// Saved-copy reads never generate; tests answer them here so generation counts stay exact.
let savedItems = () => [];
let savedCalls = 0;
let generationAdapter;
Object.defineProperty(client.default.defaults, 'adapter', { configurable: true,
  get: () => async config => {
    if (!config.url.endsWith('/saved')) return generationAdapter(config);
    savedCalls++;
    return { config, data: { items: savedItems(config) }, status: 200, statusText: 'OK', headers: {} };
  },
  set: fn => { generationAdapter = fn; } });
// Ranked by value: 테스트전자 first, so it is on by default.
const holdings = [
  { symbol_code: '005930', security_name: '테스트전자', hold_quantity: 10, avg_price: 50000 },
  { symbol_code: '000660', security_name: '테스트반도체', hold_quantity: 2, avg_price: 80000 },
];
const sectionKeys = ['current_status', 'entry_context', 'position_summary', 'recent_issues',
  'positive_factors', 'risk_factors', 'watch_points', 'limitations'];
function brief(code = '005930', headline = '객관적인 보유 정보', generated = '2026-11-02T12:40:00+09:00') {
  return { symbol_code: code, security_name: null, headline, generated_at: generated,
    ...Object.fromEntries(sectionKeys.map(key => [key, [`${key} 설명`]])),
    disclaimer: '모의투자 연습용 설명이며 투자 권유가 아닙니다.' };
}
function response(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} }; }
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const codeOf = config => config.url.split('/').at(-1);
const buttons = () => [...container.querySelectorAll('button')];
const gen = () => buttons().find(item => /브리핑 생성/.test(item.textContent));
const chips = () => [...container.querySelectorAll('[aria-label="브리핑 대상 종목"] button')];
const chip = name => chips().find(item => item.textContent.includes(name));
const block = name => container.querySelector(`section[aria-label="${name} 브리핑"]`);
const flipButton = name => block(name).querySelector('[aria-expanded]');
async function press(element) { await act(async () => element.click()); }
async function generate() { await press(gen()); }
let root;
async function render(props = {}) {
  root ??= createRoot(container);
  await act(async () => root.render(React.createElement(Card, { accountId: 7, holdings, ...props })));
}
async function remount(props) {
  await act(async () => root.unmount());
  root = null;
  await render(props);
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  client.clearToken();
  localStorage.clear();
  savedItems = () => [];
  savedCalls = 0;
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
  assert.equal(gen(), undefined);
  await render({ holdings: [] });
  assert.match(container.textContent, /보유종목이 생기면/);
  await render({ practice: true });
  assert.match(container.textContent, /연습모드에서는/);
  assert.equal(gen(), undefined);
  assert.equal(savedCalls, 0);
});

test('chips put big movers first, then larger positions; one is on by default and at most three', async () => {
  client.default.defaults.adapter = async () => assert.fail('chips must not generate');
  const list = [
    ...holdings,
    { symbol_code: '035420', security_name: '작은급등주', hold_quantity: 1, avg_price: 10000, quote: { price: 10000, change_rate: 4.2 } },
    { symbol_code: '051910', security_name: '중간종목', hold_quantity: 1, avg_price: 100000 },
  ];
  await render({ holdings: list });
  assert.deepEqual(chips().map(item => item.textContent.match(/작은급등주|테스트전자|중간종목|테스트반도체/)[0]),
    ['작은급등주', '테스트전자', '테스트반도체', '중간종목']);
  assert.match(chip('작은급등주').textContent, /035420/);
  assert.match(chip('작은급등주').textContent, /4\.2/);
  assert.match(chip('테스트전자').textContent, /비중 \d+%/);
  assert.deepEqual(chips().map(item => item.getAttribute('aria-pressed')), ['true', 'false', 'false', 'false']);
  await press(chip('테스트전자'));
  await press(chip('중간종목'));
  assert.equal(chip('테스트반도체').disabled, true);
  assert.equal(container.querySelectorAll('.portfolio-brief-block').length, 3);
  assert.match(block('중간종목').textContent, /아직 브리핑이 없어요/);
  assert.equal(savedCalls, 3, 'each chip turned on reads its saved copy once');
  await remount({ holdings: list });
  assert.deepEqual(chips().map(item => item.getAttribute('aria-pressed')), ['true', 'true', 'false', 'true']);
});

test('generation runs one stock at a time, blocks duplicates and opens each finished block in order', async () => {
  const pending = { '005930': deferred(), '000660': deferred() };
  const urls = [];
  client.default.defaults.adapter = async config => {
    urls.push(codeOf(config));
    assert.deepEqual(config.params, { account_id: 7, profile: 'luna' });
    return pending[codeOf(config)].promise.then(data => response(config, data));
  };
  await render();
  await press(chip('테스트반도체'));
  assert.deepEqual(urls, []);
  await generate();
  assert.deepEqual(urls, ['005930']);
  assert(gen().disabled);
  assert.equal(gen().textContent, '브리핑 생성 중...');
  assert.match(container.querySelector('[role="status"]').textContent, /생성하고/);
  await generate();
  assert.deepEqual(urls, ['005930']);
  await act(async () => pending['005930'].resolve(brief('005930', 'FIRST_BRIEF')));
  assert.deepEqual(urls, ['005930', '000660']);
  assert.equal(flipButton('테스트전자').getAttribute('aria-expanded'), 'true');
  assert.match(block('테스트반도체').textContent, /생성하고 있어요/);
  await act(async () => pending['000660'].resolve(brief('000660', 'SECOND_BRIEF')));
  assert(!gen().disabled);
  assert.match(container.querySelector('[role="status"]').textContent, /생성이 완료/);
  assert.deepEqual([...block('테스트전자').querySelectorAll('h4')].map(item => item.textContent), [
    '현재 상태', '포지션 시작 당시 가격 상황', '보유 흐름', '최근 확인되는 이슈',
    '긍정적으로 볼 수 있는 요인', '주의해서 볼 요인', '앞으로 확인할 점', '데이터 안내',
  ]);
  assert.match(block('테스트반도체').textContent, /SECOND_BRIEF/);
  assert.equal(flipButton('테스트반도체').getAttribute('aria-expanded'), 'false', 'only one block opens at a time');
  await press(flipButton('테스트반도체'));
  assert.equal(flipButton('테스트전자').getAttribute('aria-expanded'), 'false');
  assert.equal(block('테스트전자').querySelector('h4'), null);
  assert(block('테스트반도체').querySelector('h4'));
  assert.match(container.textContent, /모의투자 연습용 설명이며 투자 권유가 아닙니다\./);
});

test('fold shows only the headline; close moves a block to the tray and restore brings it back intact', async () => {
  client.default.defaults.adapter = async config => response(config, brief(codeOf(config), 'KEPT_BRIEF'));
  await render();
  await generate();
  await press(flipButton('테스트전자'));
  assert.equal(flipButton('테스트전자').textContent, '펼치기');
  assert.equal(block('테스트전자').querySelector('h4'), null);
  assert.equal(block('테스트전자').querySelector('.portfolio-brief-block__preview').textContent, 'KEPT_BRIEF');
  await press(container.querySelector('[aria-label="테스트전자 브리핑 닫기"]'));
  assert.equal(block('테스트전자'), null);
  assert.equal(chip('테스트전자').getAttribute('aria-pressed'), 'false');
  assert.match(container.querySelector('.portfolio-brief-tray').textContent, /닫은 브리핑.*테스트전자/);
  assert(gen().disabled, 'nothing is on');
  await press(container.querySelector('[aria-label="테스트전자 브리핑 다시 열기"]'));
  assert.equal(container.querySelector('.portfolio-brief-tray'), null);
  assert.equal(chip('테스트전자').getAttribute('aria-pressed'), 'true');
  assert.match(block('테스트전자').textContent, /KEPT_BRIEF/);
  await press(chip('테스트전자'));
  await remount();
  assert.match(container.querySelector('.portfolio-brief-tray').textContent, /테스트전자/);
});

test('empty sections are hidden and raw execution metadata is never rendered', async () => {
  const data = { ...brief(), entry_context: [], recent_issues: [], limitations: [],
    model: 'INTERNAL_MODEL', provider: 'INTERNAL_PROVIDER', reasoning: 'INTERNAL_REASONING' };
  client.default.defaults.adapter = async config => response(config, data);
  await render();
  await generate();
  assert.doesNotMatch(container.textContent, /포지션 시작 당시 가격 상황|최근 확인되는 이슈|데이터 안내|INTERNAL_/);
  assert.match(container.textContent, /현재 상태/);
});

test('failure stays in its block, hides raw details, lets later stocks run and supports retry', async () => {
  let calls = 0;
  client.default.defaults.adapter = async config => {
    calls++;
    if (calls === 1) throw Object.assign(new Error('PRIVATE_ENDPOINT INTERNAL_SECRET'), {
      config, response: { status: 502, data: { detail: 'INTERNAL_SECRET' } },
    });
    return response(config, brief(codeOf(config)));
  };
  await render();
  await press(chip('테스트반도체'));
  await generate();
  assert.equal(calls, 2);
  assert.match(block('테스트전자').querySelector('[role="alert"]').textContent, /AI 브리핑을 불러오지 못했어요/);
  assert.equal(block('테스트반도체').querySelector('[role="alert"]'), null);
  assert.doesNotMatch(container.textContent, /PRIVATE_ENDPOINT|INTERNAL_SECRET/);
  await generate();
  assert.equal(calls, 4);
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.match(block('테스트전자').textContent, /객관적인 보유 정보/);
});

for (const change of ['account', 'chip off', 'removed holding', 'unmount']) {
  test(`${change} aborts in-flight request and late completion cannot overwrite new state`, async () => {
    const pending = deferred();
    let oldSignal;
    let calls = 0;
    client.default.defaults.adapter = async config => {
      if (++calls === 1) {
        oldSignal = config.signal;
        // Like the browser adapters, an aborted request rejects at once.
        return new Promise((resolve, reject) => {
          pending.promise.then(data => resolve(response(config, data)));
          config.signal.addEventListener('abort', () => reject(new Error('canceled')));
        });
      }
      return response(config, brief(codeOf(config), 'CURRENT_BRIEF'));
    };
    await render();
    await generate();
    if (change === 'account') await render({ accountId: 8 });
    if (change === 'chip off') await press(chip('테스트전자'));
    if (change === 'removed holding') await render({ holdings: [holdings[1]] });
    if (change === 'unmount') { await act(async () => root.unmount()); root = null; }
    assert(oldSignal.aborted);
    if (change !== 'unmount') {
      assert.equal(container.querySelector('[role="alert"]'), null);
      // A removed holding leaves the remaining top holding on by default.
      if (change === 'chip off') await press(chip('테스트반도체'));
      await generate();
      assert.match(container.textContent, /CURRENT_BRIEF/);
    }
    await act(async () => pending.resolve(brief('005930', 'STALE_BRIEF')));
    assert.doesNotMatch(container.textContent, /STALE_BRIEF/);
    assert.equal(container.querySelector('[role="alert"]'), null);
    assert.equal(calls, change === 'unmount' ? 1 : 2);
  });
}

test('a chip turned off while an earlier stock is generating is skipped', async () => {
  const pending = deferred();
  const urls = [];
  client.default.defaults.adapter = async config => {
    urls.push(codeOf(config));
    return pending.promise.then(data => response(config, data));
  };
  await render();
  await press(chip('테스트반도체'));
  await generate();
  await press(chip('테스트반도체'));
  await act(async () => pending.resolve(brief('005930')));
  assert.deepEqual(urls, ['005930']);
  assert.match(container.querySelector('[role="status"]').textContent, /생성이 완료/);
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
  await press(buttons().find(item => item.textContent === '브리핑 생성하기'));
  assert.equal(aiCalls, 1);
  assert(container.querySelector('[role="alert"]'));
  assert.equal(container.querySelector('table').textContent, tableBefore);
  assert.equal(container.querySelector('[data-assets-tour="total"]').textContent, totalBefore);
  assert.doesNotMatch(container.textContent, /PRIVATE_ERROR/);
  await renderAssets({ ...auth, user: null, accounts: [], accountId: null, account: null, isAuthenticated: false });
  assert.doesNotMatch(container.textContent, /AI 보유종목 브리핑/);
});

test('StrictMode handles removed holdings without warnings, stale content or automatic generation', async () => {
  let calls = 0;
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  client.default.defaults.adapter = async config => {
    calls++;
    return response(config, brief(codeOf(config), 'STRICT_PREVIOUS'));
  };
  root = createRoot(container);
  const renderStrict = list => act(async () => root.render(React.createElement(React.StrictMode, null,
    React.createElement(Card, { accountId: 7, holdings: list }))));
  try {
    await renderStrict(holdings);
    assert.equal(calls, 0);
    await generate();
    assert.match(container.textContent, /STRICT_PREVIOUS/);
    await renderStrict([holdings[1]]);
    assert.doesNotMatch(container.textContent, /STRICT_PREVIOUS/);
    assert.equal(chip('테스트반도체').getAttribute('aria-pressed'), 'true');
    await renderStrict([]);
    assert.equal(gen(), undefined);
    assert.equal(calls, 1);
    assert.deepEqual(errors, []);
  } finally {
    console.error = originalError;
  }
});

test('browser copies survive remount per account and stock, keep two, and never generate automatically', async () => {
  let calls = 0;
  client.default.defaults.adapter = async config => {
    calls++;
    return response(config, brief(codeOf(config), `SAVED_BRIEF_${calls}`, new Date(Date.now() + calls * 1000).toISOString()));
  };
  await render();
  await generate();
  await remount();
  assert.equal(calls, 1);
  assert.match(block('테스트전자').textContent, /SAVED_BRIEF_1/);
  assert.match(block('테스트전자').textContent, /\d+\.\d+\(.\) \d{2}:\d{2} 생성/);
  assert.equal(flipButton('테스트전자').textContent, '펼치기');
  await generate();
  assert.match(container.querySelector('details summary').textContent, /이전 브리핑/);
  assert.match(container.querySelector('details').textContent, /SAVED_BRIEF_1/);
  await generate();
  assert.match(container.querySelector('details').textContent, /SAVED_BRIEF_2/);
  assert.doesNotMatch(container.textContent, /SAVED_BRIEF_1/);
  await press(chip('테스트반도체'));
  assert.match(block('테스트반도체').textContent, /아직 브리핑이 없어요/);
  await render({ accountId: 8 });
  assert.doesNotMatch(container.textContent, /SAVED_BRIEF_/);
  assert.equal(calls, 3);
});

test('server copies load on open without generating and win over an older browser copy', async () => {
  client.default.defaults.adapter = async () => assert.fail('opening must not generate');
  localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify([{ key: resourceKey('portfolio-brief', 7, '005930'), private: true,
    savedAt: Date.now(), data: [brief('005930', 'OLD_BROWSER_COPY', '2026-11-01T09:00:00+09:00')] }]));
  savedItems = config => {
    assert.deepEqual(config.params, { account_id: 7 });
    return [brief('005930', 'SERVER_COPY', '2026-11-02T12:40:00+09:00'), brief('005930', 'SERVER_OLDER', '2026-11-02T09:00:00+09:00')];
  };
  await render();
  assert.equal(savedCalls, 1);
  assert.match(block('테스트전자').textContent, /SERVER_COPY/);
  assert.match(block('테스트전자').textContent, /서버에 저장됨/);
  await press(flipButton('테스트전자'));
  assert.match(container.querySelector('details').textContent, /SERVER_OLDER/);
  assert.doesNotMatch(container.textContent, /OLD_BROWSER_COPY/);
});

test('saved mark appears only when the server returns the new briefing; failures keep the last copy', async () => {
  const fresh = brief('005930', 'FRESH_BRIEF', '2026-11-02T13:00:00+09:00');
  client.default.defaults.adapter = async config => response(config, fresh);
  await render();
  savedItems = () => [fresh];
  await generate();
  assert.match(container.textContent, /서버에 저장됨/);
  savedItems = () => [];
  client.default.defaults.adapter = async config => response(config, { ...fresh, headline: 'NOT_SAVED', generated_at: '2026-11-02T13:05:00+09:00' });
  await generate();
  assert.match(container.textContent, /NOT_SAVED/);
  assert.doesNotMatch(container.textContent, /서버에 저장됨/);
  client.default.defaults.adapter = async config => {
    throw Object.assign(new Error('offline'), { config, response: { status: 503 } });
  };
  await generate();
  assert(container.querySelector('[role="alert"]'));
  assert.match(container.textContent, /NOT_SAVED/);
});

test('session change clears browser copies and malformed copies are ignored', async () => {
  client.setToken('fixture-session-a');
  client.default.defaults.adapter = async config => response(config, brief('005930', 'KEPT_BRIEF'));
  await render();
  await generate();
  await act(async () => root.unmount());
  root = null;
  client.setToken('fixture-session-b');
  await render();
  assert.doesNotMatch(container.textContent, /KEPT_BRIEF/);
  await act(async () => root.unmount());
  root = null;
  localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify([{ key: resourceKey('portfolio-brief', 7, '005930'), private: true,
    savedAt: Date.now(), data: [{ generated_at: '2026-11-02T12:00:00+09:00', headline: 'MALFORMED_BRIEF', disclaimer: '안내' }] }]));
  await render();
  assert.doesNotMatch(container.textContent, /MALFORMED_BRIEF/);
  assert.match(block('테스트전자').textContent, /아직 브리핑이 없어요/);
});
