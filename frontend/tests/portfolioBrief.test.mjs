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
const { fetchPortfolioBrief, fetchPortfolioBriefHistory, reportBrief } = await server.ssrLoadModule('/src/api/data.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const { CACHE_STORAGE_KEY, resourceKey } = await server.ssrLoadModule('/src/api/resourceCache.js');
const container = document.getElementById('root');

// A small in-memory server: the saved list, deletes and reports never generate.
// Successful generations are saved with an id unless a test turns autosave off.
const db = { items: [], nextId: 1, autosave: true, listCalls: 0, deletes: [], reports: [], failList: false, failDelete: false };
const ok = (config, data, status = 200) => ({ config, data, status, statusText: 'OK', headers: {} });
const acceptReport = config => { db.reports.push(JSON.parse(config.data)); return ok(config, { id: 1, created_at: new Date().toISOString() }, 201); };
let reportAdapter = acceptReport;
let generationAdapter;
Object.defineProperty(client.default.defaults, 'adapter', { configurable: true,
  get: () => async config => {
    if (config.url === '/ai/portfolio-briefs') {
      db.listCalls++;
      if (db.failList) throw Object.assign(new Error('offline'), { config });
      return ok(config, { items: db.items });
    }
    if (config.url.startsWith('/ai/portfolio-briefs/') && config.method === 'delete') {
      const id = Number(config.url.split('/').at(-1));
      if (db.failDelete) throw Object.assign(new Error('offline'), { config, response: { status: 503 } });
      db.deletes.push(id);
      db.items = db.items.filter(item => item.id !== id);
      return ok(config, '', 204);
    }
    if (config.url === '/ai/brief-reports') return reportAdapter(config);
    const result = await generationAdapter(config);
    if (db.autosave && config.url.startsWith('/ai/portfolio-brief/')) db.items = [{ ...result.data, id: db.nextId++ }, ...db.items];
    return result;
  },
  set: fn => { generationAdapter = fn; } });

// Ranked by value: 테스트전자 first, so it is on by default.
const holdings = [
  { symbol_code: '005930', security_name: '테스트전자', hold_quantity: 10, avg_price: 50000 },
  { symbol_code: '000660', security_name: '테스트반도체', hold_quantity: 2, avg_price: 80000 },
];
const sectionKeys = ['current_status', 'entry_context', 'position_summary', 'recent_issues',
  'positive_factors', 'risk_factors', 'watch_points', 'limitations'];
const ago = days => new Date(Date.now() - days * 86400e3).toISOString();
let tick = 0;
function brief(code = '005930', headline = '객관적인 보유 정보', generated = new Date(Date.now() + tick++).toISOString()) {
  return { symbol_code: code, security_name: null, headline, generated_at: generated,
    ...Object.fromEntries(sectionKeys.map(key => [key, [`${key} 설명`]])),
    disclaimer: '모의투자 연습용 설명이며 투자 권유가 아닙니다.' };
}
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
const history = () => container.querySelector('section[aria-label="이전 브리핑"]');
const days = () => [...history().querySelectorAll('h4.portfolio-brief-history__day')].map(item => item.textContent);
const boxes = () => [...history().querySelectorAll('.portfolio-brief-history__box')];
const byLabel = label => container.querySelector(`[aria-label="${label}"]`);
const buttonIn = (element, text) => [...element.querySelectorAll('button')].find(item => item.textContent === text);
async function press(element) { await act(async () => element.click()); }
async function generate() { await press(gen()); }
const fire = (element, type) => element.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button: 0 }));
const switchOf = name => chip(name).querySelector('.portfolio-brief-chip__switch').textContent;
// Presses a chip down for `ms`, then lets go the way a browser does: pointerup followed by click.
async function hold(name, ms) {
  await act(async () => fire(chip(name), 'pointerdown'));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
  await act(async () => { fire(chip(name), 'pointerup'); chip(name).click(); });
}
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
  Object.assign(db, { items: [], nextId: 1, autosave: true, listCalls: 0, deletes: [], reports: [], failList: false, failDelete: false });
  reportAdapter = acceptReport;
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
    return ok(config, brief('A/B C'));
  };
  db.autosave = false;
  await fetchPortfolioBrief(7, 'A/B C', controller.signal);
  await fetchPortfolioBrief(7, 'A/B C', controller.signal, 'luna');
  assert.equal(calls, 2, 'manual re-run bypasses cached responses');
});

test('helper rejects malformed top-level, malformed sections and wrong-stock responses', async () => {
  db.autosave = false;
  for (const data of [null, [], { detail: 'unavailable' }, { ...brief(), entry_context: {} },
    { ...brief(), current_status: [] }, { ...brief(), headline: ' ' }, brief('000660')]) {
    client.default.defaults.adapter = async config => ok(config, data);
    await assert.rejects(fetchPortfolioBrief(7, '005930'));
  }
});

test('history helper keeps only well-formed saved items; report helper sends identifiers only', async () => {
  db.items = [{ ...brief(), id: 3 }, brief(), { ...brief(), id: 4, current_status: [] }, { ...brief(), id: 5, generated_at: 'nope' }];
  assert.deepEqual((await fetchPortfolioBriefHistory(7)).map(item => item.id), [3]);
  await reportBrief({ kind: 'stock', code: '000660', generatedAt: 'T', accountId: 7, reason: 'other', note: '  ' });
  await reportBrief({ kind: 'portfolio', code: '005930', generatedAt: 'T', accountId: 7, reason: 'wrong_fact', note: ' 숫자 ' });
  assert.deepEqual(db.reports, [
    { kind: 'stock', symbol_code: '000660', generated_at: 'T', account_id: null, reason: 'other', note: null },
    { kind: 'portfolio', symbol_code: '005930', generated_at: 'T', account_id: 7, reason: 'wrong_fact', note: '숫자' },
  ]);
});

test('no account, empty holdings and practice never request anything', async () => {
  client.default.defaults.adapter = async () => assert.fail('Must not request');
  await render({ accountId: null });
  assert.match(container.textContent, /계좌를 선택해 주세요/);
  assert.equal(gen(), undefined);
  await render({ holdings: [] });
  assert.match(container.textContent, /보유종목이 생기면/);
  await render({ practice: true });
  assert.match(container.textContent, /연습모드에서는/);
  assert.equal(gen(), undefined);
  assert.equal(db.listCalls, 0);
});

test('chips put big movers first, then larger positions; one is on by default and at most four', async () => {
  client.default.defaults.adapter = async () => assert.fail('chips must not generate');
  const list = [
    ...holdings,
    { symbol_code: '035420', security_name: '작은급등주', hold_quantity: 1, avg_price: 10000, quote: { price: 10000, change_rate: 4.2 } },
    { symbol_code: '051910', security_name: '중간종목', hold_quantity: 1, avg_price: 100000 },
    { symbol_code: '000270', security_name: '막내종목', hold_quantity: 1, avg_price: 1000 },
  ];
  await render({ holdings: list });
  assert.deepEqual(chips().map(item => item.textContent.match(/작은급등주|테스트전자|중간종목|테스트반도체|막내종목/)[0]),
    ['작은급등주', '테스트전자', '테스트반도체', '중간종목', '막내종목']);
  assert.doesNotMatch(chip('작은급등주').textContent, /035420/);
  assert.doesNotMatch(chip('작은급등주').textContent, /4\.2/);
  assert.doesNotMatch(chip('테스트전자').textContent, /비중 \d+%/);
  assert.deepEqual(chips().map(item => item.getAttribute('aria-pressed')), ['true', 'false', 'false', 'false', 'false']);
  for (const name of ['테스트전자', '테스트반도체', '중간종목']) await press(chip(name));
  assert.equal(chip('막내종목').disabled, true);
  assert.equal(container.querySelectorAll('.portfolio-brief-block').length, 0);
  assert.equal(block('중간종목'), null);
  assert.equal(db.listCalls, 1, 'the saved list is read once per account');
  await remount({ holdings: list });
  assert.deepEqual(chips().map(item => item.getAttribute('aria-pressed')), ['true', 'true', 'true', 'true', 'false']);
});

test('generation runs one stock at a time, blocks duplicates and opens only the first finished block', async () => {
  const pending = { '005930': deferred(), '000660': deferred() };
  const urls = [];
  client.default.defaults.adapter = async config => {
    urls.push(codeOf(config));
    assert.deepEqual(config.params, { account_id: 7, profile: 'luna' });
    return pending[codeOf(config)].promise.then(data => ok(config, data));
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
  assert.match(container.querySelector('[role="status"]').textContent, /생성이 완료/);
  assert.deepEqual([...block('테스트전자').querySelectorAll('h4')].map(item => item.textContent), [
    '현재 상태', '포지션 시작 당시 가격 상황', '보유 흐름', '최근 확인되는 이슈',
    '긍정적으로 볼 수 있는 요인', '주의해서 볼 요인', '앞으로 확인할 점', '데이터 안내',
  ]);
  assert.match(block('테스트반도체').textContent, /SECOND_BRIEF/);
  assert.match(block('테스트반도체').textContent, /서버에 저장됨/);
  assert.equal(flipButton('테스트반도체').getAttribute('aria-expanded'), 'false', 'only one block opens at a time');
  await press(flipButton('테스트반도체'));
  assert.equal(flipButton('테스트전자').getAttribute('aria-expanded'), 'false');
  assert(block('테스트반도체').querySelector('h4'));
  assert.match(container.textContent, /모의투자 연습용 설명이며 투자 권유가 아닙니다\./);
});

test('the main button fills stocks without a briefing today; holding a chip marks it RE for the next run', async () => {
  const urls = [];
  client.default.defaults.adapter = async config => {
    urls.push(codeOf(config));
    return ok(config, brief(codeOf(config), `BRIEF_${urls.length}`));
  };
  db.items = [{ ...brief('000660', 'YESTERDAY', ago(1)), id: 90 }, { ...brief('005930', 'TODAY_DONE'), id: 91 }];
  await render();
  await press(chip('테스트반도체'));
  assert.doesNotMatch(container.textContent, /생성할 종목: 테스트반도체\(오늘 처음\)/);
  await generate();
  assert.deepEqual(urls, ['000660']);
  assert(gen().disabled);
  assert.doesNotMatch(container.textContent, /켠 종목은 오늘 브리핑이 있어요/);
  assert.equal(byLabel('테스트전자 브리핑 다시 생성'), null, 'no separate regenerate button');
  await act(async () => fire(chip('테스트전자'), 'pointerdown'));
  assert.equal(switchOf('테스트전자'), 'ON', 'a quick tap shows nothing');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)); });
  assert.equal(switchOf('테스트전자'), 'RE');
  assert(chip('테스트전자').classList.contains('is-charging'));
  await act(async () => { chip('테스트전자').dispatchEvent(new window.MouseEvent('pointerout', { bubbles: true, relatedTarget: container })); });
  assert.equal(switchOf('테스트전자'), 'ON', 'sliding off cancels the charge');
  await act(async () => fire(chip('테스트전자'), 'pointerdown'));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 600)); });
  await act(async () => { fire(chip('테스트전자'), 'pointerup'); chip('테스트전자').click(); });
  assert.equal(switchOf('테스트전자'), 'ON', 'letting go mid-charge settles back to ON');
  assert.equal(chip('테스트전자').getAttribute('aria-pressed'), 'true');
  await hold('테스트전자', 1500);
  assert.deepEqual(urls, ['000660'], 'holding only selects; it never generates by itself');
  assert.equal(switchOf('테스트전자'), 'RE');
  assert.equal(chip('테스트전자').getAttribute('aria-pressed'), 'true', 'the hold does not also toggle the chip');
  assert.doesNotMatch(container.textContent, /생성할 종목: 테스트전자\(RE\)/);
  await press(chip('테스트전자'));
  assert.equal(switchOf('테스트전자'), 'ON', 'a tap on RE goes back to ON');
  assert(gen().disabled);
  await hold('테스트전자', 1500);
  await generate();
  assert.deepEqual(urls, ['000660', '005930']);
  assert.equal(switchOf('테스트전자'), 'ON', 'RE returns to ON after regenerating');
  assert.match(block('테스트전자').textContent, /BRIEF_2/);
  assert.doesNotMatch(history().textContent, /TODAY_DONE/, 'the history shows only the last briefing of the day per stock');
  assert(db.items.some(item => item.headline === 'TODAY_DONE'), 'the replaced briefing is still saved');
  assert(gen().disabled);
  await hold('테스트전자', 200);
  assert.equal(chip('테스트전자').getAttribute('aria-pressed'), 'false', 'a short press only toggles');
});

test('a chip without a briefing never charges', async () => {
  client.default.defaults.adapter = async () => assert.fail('must not generate');
  await render();
  await act(async () => fire(chip('테스트전자'), 'pointerdown'));
  assert.equal(switchOf('테스트전자'), 'ON', 'nothing to regenerate yet');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 1500)); });
  assert.equal(switchOf('테스트전자'), 'ON');
  await act(async () => fire(chip('테스트전자'), 'pointerup'));
});

test('fold shows only the headline; close moves a block to the tray and restore brings it back intact', async () => {
  client.default.defaults.adapter = async config => ok(config, brief(codeOf(config), 'KEPT_BRIEF'));
  await render();
  await generate();
  await press(flipButton('테스트전자'));
  assert.equal(flipButton('테스트전자').textContent, '펼치기');
  assert.equal(block('테스트전자').querySelector('h4'), null);
  assert.equal(block('테스트전자').querySelector('.portfolio-brief-block__preview').textContent, 'KEPT_BRIEF');
  await press(byLabel('테스트전자 브리핑 닫기'));
  assert.equal(block('테스트전자'), null);
  assert.equal(chip('테스트전자').getAttribute('aria-pressed'), 'false');
  assert.match(container.querySelector('.portfolio-brief-tray').textContent, /닫은 브리핑.*테스트전자/);
  assert(gen().disabled, 'nothing is on');
  await press(byLabel('테스트전자 브리핑 다시 열기'));
  assert.equal(container.querySelector('.portfolio-brief-tray'), null);
  assert.match(block('테스트전자').textContent, /KEPT_BRIEF/);
  await press(chip('테스트전자'));
  await remount();
  assert.match(container.querySelector('.portfolio-brief-tray').textContent, /테스트전자/);
});

test('previous briefings group by day up to three days ago, open one at a time and delete after confirming', async () => {
  client.default.defaults.adapter = async () => assert.fail('history must not generate');
  db.items = [
    { ...brief('000660', 'TODAY_B_EARLIER'), generated_at: new Date(Date.now() - 60e3).toISOString(), id: 6 },
    { ...brief('005930', 'TODAY_A'), id: 1 }, { ...brief('000660', 'TODAY_B'), id: 2 },
    { ...brief('005930', 'ONE_DAY'), generated_at: ago(1), id: 3 },
    { ...brief('999999', 'SOLD_STOCK'), security_name: '판종목', generated_at: ago(3), id: 4 },
    { ...brief('005930', 'TOO_OLD'), generated_at: ago(5), id: 5 },
  ].sort((a, b) => Date.parse(b.generated_at) - Date.parse(a.generated_at));
  await render();
  assert.deepEqual(days(), ['오늘', '1일 전', '3일 전']);
  assert.doesNotMatch(container.textContent, /TOO_OLD/);
  assert.match(history().textContent, /판종목/);
  assert.doesNotMatch(history().textContent, /TODAY_B_EARLIER/, 'only the last briefing of the day per stock');
  assert.equal(boxes().length, 4);
  assert.match(block('테스트전자').textContent, /TODAY_A/);
  assert.match(block('테스트전자').textContent, /서버에 저장됨/);
  const todayB = () => boxes().find(item => item.textContent.includes('TODAY_B'));
  const todayA = () => boxes().find(item => item.textContent.includes('TODAY_A'));
  await press(todayA().querySelector('[aria-expanded]'));
  assert.match(history().querySelector('.portfolio-brief-history__open h3').textContent, /TODAY_A/);
  await press(todayB().querySelector('[aria-expanded]'));
  assert.equal(history().querySelectorAll('.portfolio-brief-history__open').length, 1);
  assert.match(history().querySelector('.portfolio-brief-history__open h3').textContent, /TODAY_B/);
  await press(byLabel('테스트반도체 브리핑 삭제'));
  await press(buttonIn(todayB(), '취소'));
  assert.equal(db.deletes.length, 0);
  db.failDelete = true;
  await press(byLabel('테스트반도체 브리핑 삭제'));
  await press(buttonIn(todayB(), '삭제'));
  assert.match(todayB().textContent, /삭제하지 못했어요/);
  db.failDelete = false;
  await press(buttonIn(todayB(), '삭제'));
  assert.deepEqual(db.deletes, [2, 6], 'the hidden earlier briefing of that day goes too');
  assert.doesNotMatch(container.textContent, /TODAY_B/);
  await press(todayA().querySelector('[aria-label="테스트전자 브리핑 삭제"]'));
  await press(buttonIn(todayA(), '삭제'));
  assert.match(block('테스트전자').textContent, /ONE_DAY/, 'the block falls back to the next newest briefing');
  await remount();
  assert.doesNotMatch(container.textContent, /TODAY_A|TODAY_B/);
});

test('report sends the reason and note for a saved briefing; duplicates count as done, failures are local', async () => {
  client.default.defaults.adapter = async () => assert.fail('report must not generate');
  const generated = new Date().toISOString();
  db.items = [{ ...brief('005930', 'ODD_BRIEF', generated), id: 1 }];
  await render();
  await press(flipButton('테스트전자'));
  await press(buttonIn(block('테스트전자'), '신고하기'));
  const form = block('테스트전자').querySelector('form[aria-label="브리핑 신고"]');
  await act(async () => form.querySelector('input[value="wrong_stock"]').click());
  await act(async () => {
    const input = form.querySelector('input[aria-label="신고 내용"]');
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '다른 회사 이야기');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  reportAdapter = config => { db.reports.push(JSON.parse(config.data)); throw Object.assign(new Error('PRIVATE'), { config, response: { status: 500 } }); };
  await act(async () => form.querySelector('button[type="submit"]').click());
  assert.match(form.querySelector('[role="alert"]').textContent, /보내지 못했어요/);
  assert.doesNotMatch(container.textContent, /PRIVATE/);
  reportAdapter = config => { db.reports.push(JSON.parse(config.data)); throw Object.assign(new Error('dup'), { config, response: { status: 409 } }); };
  await act(async () => form.querySelector('button[type="submit"]').click());
  assert.match(block('테스트전자').textContent, /신고가 접수됐어요/);
  assert.deepEqual(db.reports.at(-1), { kind: 'portfolio', symbol_code: '005930', generated_at: generated,
    account_id: 7, reason: 'wrong_stock', note: '다른 회사 이야기' });
});

test('empty sections are hidden and raw execution metadata is never rendered', async () => {
  const data = { ...brief(), entry_context: [], recent_issues: [], limitations: [],
    model: 'INTERNAL_MODEL', provider: 'INTERNAL_PROVIDER', reasoning: 'INTERNAL_REASONING' };
  client.default.defaults.adapter = async config => ok(config, data);
  db.autosave = false;
  await render();
  await generate();
  assert.doesNotMatch(block('테스트전자').textContent, /포지션 시작 당시 가격 상황|최근 확인되는 이슈|데이터 안내/);
  assert.doesNotMatch(container.textContent, /INTERNAL_/);
  assert.match(container.textContent, /현재 상태/);
});

test('failure stays in its block, hides raw details, lets later stocks run and supports retry', async () => {
  let calls = 0;
  client.default.defaults.adapter = async config => {
    calls++;
    if (calls === 1) throw Object.assign(new Error('PRIVATE_ENDPOINT INTERNAL_SECRET'), {
      config, response: { status: 502, data: { detail: 'INTERNAL_SECRET' } },
    });
    return ok(config, brief(codeOf(config)));
  };
  await render();
  await press(chip('테스트반도체'));
  await generate();
  assert.equal(calls, 2);
  assert.match(block('테스트전자').querySelector('[role="alert"]').textContent, /AI 브리핑을 불러오지 못했어요/);
  assert.equal(block('테스트반도체').querySelector('[role="alert"]'), null);
  assert.doesNotMatch(container.textContent, /PRIVATE_ENDPOINT|INTERNAL_SECRET/);
  await generate();
  assert.equal(calls, 3, 'only the failed stock is still pending');
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
          pending.promise.then(data => resolve(ok(config, data)));
          config.signal.addEventListener('abort', () => reject(new Error('canceled')));
        });
      }
      return ok(config, brief(codeOf(config), 'CURRENT_BRIEF'));
    };
    db.autosave = false;
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
    return pending.promise.then(data => ok(config, data));
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
    if (config.url === '/trading/portfolio') return ok(config, { holdings, withdrawable_cash: 100000 });
    if (config.url.endsWith('/price')) return ok(config, { current_price: 60000 });
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

test('StrictMode handles removed holdings without warnings or automatic generation', async () => {
  let calls = 0;
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  client.default.defaults.adapter = async config => {
    calls++;
    return ok(config, brief(codeOf(config), 'STRICT_PREVIOUS'));
  };
  root = createRoot(container);
  const renderStrict = list => act(async () => root.render(React.createElement(React.StrictMode, null,
    React.createElement(Card, { accountId: 7, holdings: list }))));
  try {
    await renderStrict(holdings);
    assert.equal(calls, 0);
    await generate();
    assert.match(block('테스트전자').textContent, /STRICT_PREVIOUS/);
    await renderStrict([holdings[1]]);
    assert.equal(block('테스트전자'), null);
    assert.equal(chip('테스트반도체').getAttribute('aria-pressed'), 'true');
    await renderStrict([]);
    assert.equal(gen(), undefined);
    assert.equal(calls, 1);
    assert.deepEqual(errors, []);
  } finally {
    console.error = originalError;
  }
});

test('browser copies show at once, the server list wins, and unsaved copies stay marked as browser-only', async () => {
  client.default.defaults.adapter = async config => ok(config, brief(codeOf(config), 'LOCAL_ONLY'));
  db.autosave = false;
  await render();
  await generate();
  assert.doesNotMatch(block('테스트전자').textContent, /서버에 저장됨/);
  assert.match(history().textContent, /이 브라우저에만 저장됨/);
  await act(async () => root.unmount());
  root = null;
  db.failList = true;
  await render();
  assert.match(block('테스트전자').textContent, /LOCAL_ONLY/);
  await act(async () => root.unmount());
  root = null;
  db.failList = false;
  db.items = [{ ...brief('005930', 'SERVER_COPY'), id: 9 }];
  await render();
  assert.match(block('테스트전자').textContent, /SERVER_COPY/);
  assert.match(block('테스트전자').textContent, /서버에 저장됨/);
  // The unsaved copy is kept, but the newer server briefing is that day's last one, so the history shows that.
  assert.match(localStorage.getItem(CACHE_STORAGE_KEY), /LOCAL_ONLY/);
  assert.doesNotMatch(history().textContent, /LOCAL_ONLY/);
});

test('session change clears browser copies and malformed copies are ignored', async () => {
  client.setToken('fixture-session-a');
  client.default.defaults.adapter = async config => ok(config, brief('005930', 'KEPT_BRIEF'));
  db.autosave = false;
  await render();
  await generate();
  await act(async () => root.unmount());
  root = null;
  client.setToken('fixture-session-b');
  await render();
  assert.doesNotMatch(container.textContent, /KEPT_BRIEF/);
  await act(async () => root.unmount());
  root = null;
  localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify([{ key: resourceKey('portfolio-brief-history', 7, 'all'), private: true,
    savedAt: Date.now(), data: [{ symbol_code: '005930', generated_at: new Date().toISOString(), headline: 'MALFORMED_BRIEF', disclaimer: '안내' }] }]));
  await render();
  assert.doesNotMatch(container.textContent, /MALFORMED_BRIEF/);
  assert.equal(block('테스트전자'), null);
});

test('trend guesses show in their own marked section; missing or malformed guesses show nothing', async () => {
  const guess = '추정: 실적 보도가 나온 주에 주가도 올라, 실적 기대와 관련된 흐름으로 추정돼요.';
  client.default.defaults.adapter = async config => ok(config, { ...brief(codeOf(config), 'WITH_GUESS'), trend_guesses: [guess] });
  await render();
  await generate();
  const section = block('테스트전자').querySelector('.portfolio-brief-guess');
  assert.match(section.textContent, /추정 · 주의해서 읽어 주세요/);
  assert.match(section.textContent, /확인된 사실이나 앞으로의 전망이 아니에요/);
  assert.match(section.textContent, /실적 기대와 관련된 흐름으로 추정돼요/);
  assert.doesNotMatch(section.querySelector('li').textContent, /^추정:/, 'the box title already says it');
  await act(async () => root.unmount());
  root = null;
  localStorage.clear();
  db.items = [{ ...brief('005930', 'OLD_SAVED'), id: 3 }, { ...brief('000660', 'BAD_GUESS'), trend_guesses: 'oops', id: 4 }];
  await render({ holdings: [...holdings] });
  assert.match(block('테스트전자').textContent, /OLD_SAVED/, 'briefings saved before guesses existed still show');
  await press(flipButton('테스트전자'));
  assert.equal(block('테스트전자').querySelector('.portfolio-brief-guess'), null);
  assert.match(history().textContent, /BAD_GUESS/, 'a malformed guess list is dropped, not the briefing');
});

test('article numbers become source links with a copy button; plain views drop the numbers', async () => {
  const sources = [{ title: '공급 계약 기사', url: 'https://n.news.naver.com/a', source: '연합뉴스', date: '2026.11.02' },
    { title: '링크 없는 기사', url: null, source: null, date: null }];
  client.default.defaults.adapter = async config => ok(config, { ...brief(codeOf(config), '공급 계약을 맺었습니다. [1]'),
    recent_issues: ['수요가 공급을 웃돈다고 밝혔습니다. [1][2][7]'], sources });
  const copied = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => copied.push(text) } } });
  await render();
  await generate();
  const head = block('테스트전자').querySelector('h3');
  assert.equal(head.textContent.startsWith('공급 계약을 맺었습니다.연합뉴스 ↗'), true);
  assert.equal(head.querySelector('a').getAttribute('href'), 'https://n.news.naver.com/a');
  assert.equal(head.querySelector('a').getAttribute('target'), '_blank');
  const issue = [...block('테스트전자').querySelectorAll('li')].find(item => item.textContent.includes('수요가'));
  assert.equal(issue.querySelectorAll('a').length, 1, 'unknown numbers are dropped');
  assert.match(issue.textContent, /기사$/, 'a source without a link shows as a plain label');
  assert.doesNotMatch(block('테스트전자').textContent, /\[\d\]/);
  await press(byLabel('연합뉴스 기사 링크 복사'));
  assert.deepEqual(copied, ['https://n.news.naver.com/a']);
  assert.equal(history().textContent.includes('[1]'), false);
});

test('reports from the days before the position started get their own section with links', async () => {
  const sources = [{ title: '최근 기사', url: 'https://n.news.naver.com/r', source: '최근매체', date: null },
    { title: '매수 무렵 기사', url: 'https://n.news.naver.com/e', source: '과거매체', date: '2026.10.19 09:00' }];
  client.default.defaults.adapter = async config => ok(config, { ...brief(codeOf(config), 'ENTRY'),
    entry_news_summary: ['시작 직전 신제품을 공개했습니다. [2]'], sources });
  await render();
  await generate();
  const section = [...block('테스트전자').querySelectorAll('section')].find(item => item.querySelector('h4')?.textContent === '포지션 시작 무렵 보도');
  assert.match(section.textContent, /시작 직전 신제품을 공개했습니다\./);
  assert.equal(section.querySelector('a').getAttribute('href'), 'https://n.news.naver.com/e');
});
