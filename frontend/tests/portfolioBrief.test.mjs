import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
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
let newsAdapter;
Object.defineProperty(client.default.defaults, 'adapter', { configurable: true,
  get: () => async config => {
    if (config.url.startsWith('/ai/stock-brief/')) return newsAdapter ? newsAdapter(config) : ok(config, publicBrief(codeOf(config)));
    if (config.url === '/trading/portfolio') return ok(config, { holdings });
    if (config.url === '/ai/theme-brief') throw new Error('No theme fixture');
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
function publicBrief(code = '005930') {
  return { symbol_code: code, name: holdings.find(item => item.symbol_code === code)?.security_name || code,
    price: 50000, change_rate: 1, generated_at: new Date().toISOString(), as_of: new Date().toISOString(),
    ai_available: true, title: '반도체 공급 계약 확인', recent_issues: ['공통 뉴스 본문'],
    positive_factors: ['공통 뉴스 본문', '생산 확대 가능성'], risk_factors: ['수요 둔화 가능성'],
    citations: { '공통 뉴스 본문': [{ title: '계약 공시 기사', source: '뉴스 출처', url: 'https://example.com/news' }] },
    related: [], evidence: [{ title: '계약 공시 기사', source: '뉴스 출처', url: 'https://example.com/news' }],
    source: '네이버 증권', disclaimer: '기사 요약 안내' };
}
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
  await act(async () => root.render(React.createElement(AuthContext.Provider, { value: { accountId: 7, isAuthenticated: true } }, React.createElement(Card, { accountId: 7, holdings, ...props }))));
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
  newsAdapter = null;
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

test('all holdings appear as topic cards and preserve the three shared news categories', async () => {
  await render({ holdings: Array.from({ length: 12 }, (_, index) => ({ ...holdings[0], symbol_code: String(index).padStart(6, '0'), security_name: `보유종목 ${index}` })) });
  assert.equal(container.querySelectorAll('[data-news-card]').length, 12);
  assert.equal(container.querySelectorAll('.portfolio-news-column').length, 3);
  assert.equal(container.querySelector('.portfolio-news-column').querySelectorAll('[data-news-card]').length, 5);
  await press(container.querySelector('[data-news-card] button'));
  const detail = container.querySelector('.portfolio-news-detail');
  assert.ok(detail);
  assert.equal(container.querySelectorAll('[data-news-card]').length, 11);
  assert.equal(detail.querySelectorAll('.shared-news-copy li').length, 4);
  assert.deepEqual([...detail.querySelectorAll('.shared-news-section h4')].map(item => item.textContent),
    ['최근 확인되는 뉴스', '긍정적으로 볼 수 있는 요인', '주의해서 볼 수 있는 요인']);
  assert.doesNotMatch(detail.textContent, /현재 상태|앞으로 확인할 점|데이터 안내/);
  assert.equal(detail.querySelector('.shared-news-copy li a').href, 'https://example.com/news');
  assert.equal(detail.querySelector('.shared-news-sources'), null);
  assert.equal(detail.querySelectorAll('.shared-news-copy li')[2].querySelector('a'), null);
  await press(byLabel('뉴스 요약 접기'));
  assert.equal(container.querySelector('.portfolio-news-detail'), null);
  assert.equal(container.querySelectorAll('[data-news-card]').length, 12);
});

test('personal generation preserves the common news and cited guesses, is saved without a regenerate button', async () => {
  let calls = 0;
  client.default.defaults.adapter = async config => {
    calls++;
    const news = publicBrief(codeOf(config));
    return ok(config, { ...brief(codeOf(config), '기존 보유종목 브리핑의 첫 제목 [1]'), current_status: [],
      watch_points: ['계약 후속 공시를 확인합니다. [1]'],
      banner_summary: '공급계약·생산계획',
      recent_issues: news.recent_issues, positive_factors: news.positive_factors, risk_factors: news.risk_factors,
      news_brief: news, trend_guesses: ['수요와 가격 흐름의 연관 가능성이 있어요. [1]'],
      sources: [{ title: '계약 공시 기사', source: '뉴스 출처', url: 'https://example.com/news' }] });
  };
  await render();
  assert.equal(calls, 0, 'opening the board does not generate personal guesses');
  await press(byLabel('테스트전자 뉴스 요약 열기'));
  assert.equal(calls, 1);
  assert.equal(db.items.length, 1);
  // 한 줄 요약이 있으면 상세 제목은 그 요약(또는 더 자세한 banner_detail)을 쓴다.
  assert.equal(container.querySelector('.portfolio-news-detail .trading-news-summary p').textContent, '공급계약·생산계획');
  assert.equal(container.querySelector('.portfolio-news-detail .trading-news-summary a'), null);
  assert.equal(container.querySelector('.portfolio-brief-keywords span').textContent, '계약 후속 공시');
  assert.equal(container.querySelector('.portfolio-brief-guess .portfolio-brief-keywords'), null);
  assert.equal(container.querySelector('.portfolio-brief-guess').nextElementSibling.className, 'portfolio-brief-keywords');
  const guess = container.querySelector('.portfolio-brief-guess');
  assert.match(guess.textContent, /연관 가능성/);
  assert.equal(guess.querySelector('a').href, 'https://example.com/news');
  assert.ok(guess.querySelector('[aria-label="뉴스 출처 기사 링크 복사"]'));
  assert.equal(container.querySelectorAll('.portfolio-news-detail .shared-news-copy li').length, 4);
  assert.equal(container.querySelector('.portfolio-news-generate'), null);
  assert.ok(guess.querySelector('h4'));
  assert.equal(guess.querySelector('.portfolio-brief-guess-note').textContent, '기사와 가격 흐름을 보고 추정한 내용이며, 확인된 사실이 아닙니다.');
  assert.equal(container.querySelector('.trading-news-footnote'), null);
  await press(byLabel('뉴스 요약 접기'));
  // 카드에는 한 줄 요약을 보여 준다.
  assert.match(byLabel('테스트전자 뉴스 요약 열기').textContent, /공급계약·생산계획/);
  assert.doesNotMatch(byLabel('테스트전자 뉴스 요약 열기').textContent, /기존 보유종목 브리핑의 첫 제목/);
  await press(byLabel('테스트전자 뉴스 요약 열기'));
  assert.equal(calls, 1, 'saved guesses are reused when reopening');
});

test('without a summary the legacy portfolio title stays as the detail title', async () => {
  db.items = [{ ...brief('005930', '원래 보유종목 요약 제목', ago(1)), id: 1, trend_guesses: ['기존 추정'], watch_points: ['후속 공시'] }];
  await render();
  await press(byLabel('테스트전자 뉴스 요약 열기'));
  assert.equal(container.querySelector('.portfolio-news-detail .trading-news-summary p').textContent, '원래 보유종목 요약 제목');
});

test('legacy portfolio titles survive newer public news and match the AI news window', async () => {
  db.items = [{ ...brief('005930', '원래 보유종목 요약 제목', ago(1)), id: 1,
    trend_guesses: ['기존 추정'], watch_points: ['후속 공시'], banner_summary: '요약 문구' }];
  await render();
  const bannerBefore = byLabel('테스트전자 뉴스 요약 열기').textContent;
  await press(byLabel('테스트전자 뉴스 요약 열기'));
  // 요약이 있으면 보드와 AI 뉴스 창 모두 같은 요약을 상세 제목으로 쓴다.
  assert.equal(container.querySelector('.portfolio-news-detail .trading-news-summary p').textContent, '요약 문구');
  await press(container.querySelector('.portfolio-news-toolbar .trading-news-banner'));
  assert.equal(document.querySelector('[role="dialog"] .trading-news-summary p').textContent, '요약 문구');
  assert.equal(document.querySelector('[role="dialog"] .shared-news-copy').textContent, container.querySelector('.portfolio-news-detail .shared-news-copy').textContent);
  await press(document.querySelector('[role="dialog"] [aria-label="닫기"]'));
  await press(byLabel('뉴스 요약 접기'));
  assert.equal(byLabel('테스트전자 뉴스 요약 열기').textContent, bannerBefore);
});

test('failed guesses leave public news readable and can be retried without leaking errors', async () => {
  let calls = 0;
  client.default.defaults.adapter = async () => { calls++; throw new Error('private-provider-error'); };
  await render();
  await press(byLabel('테스트전자 뉴스 요약 열기'));
  assert.match(container.querySelector('.portfolio-news-detail').textContent, /다시 불러오기/);
  assert.match(container.querySelector('.shared-news-copy').textContent, /공통 뉴스 본문/);
  assert.doesNotMatch(container.textContent, /private-provider-error/);
  assert.equal(container.querySelector('.portfolio-news-generate'), null);
  assert.equal(calls, 1, 'a failed automatic request must not loop');
  await press(container.querySelector('[role="alert"] button'));
  assert.equal(calls, 2);
});

test('previous briefings are hidden without deleting saved records', async () => {
  db.items = [{ ...brief('005930', 'LATEST'), id: 1 }];
  await render();
  assert.equal(container.querySelector('.portfolio-news-history'), null);
  assert.equal(db.items.length, 1);
  assert.deepEqual(db.deletes, []);
});

test('news topic classification is grounded in text and unknown topics stay unclassified', async () => {
  const { newsTheme, newsColumns, relatedNewsPairs } = await server.ssrLoadModule('/src/utils/newsThemes.js');
  assert.equal(newsTheme(publicBrief()), '반도체');
  assert.equal(newsTheme({ title: '공급 계약 발표' }), '기타 뉴스');
  assert.equal(newsColumns([{ code: 'A' }, { code: 'B' }], {}, 'A')[0].stocks[0].code, 'B');
  const stocks = ['A', 'B', 'C', 'D'].map(code => ({ code }));
  assert.deepEqual(relatedNewsPairs(stocks, {}), [], 'unclassified stocks must not imply a relationship');
  assert.deepEqual(relatedNewsPairs(stocks, { A: publicBrief(), B: publicBrief(), C: { related: [{ code: 'D' }, { code: 'OUTSIDE' }] } }), [['A', 'B'], ['C', 'D']]);
});

test('expanded stocks put related holdings first without duplicates or unrelated unknown topics', async () => {
  const { newsColumns } = await server.ssrLoadModule('/src/utils/newsThemes.js');
  const stocks = ['A', 'B', 'C', 'D', 'E'].map(code => ({ code }));
  const briefs = { A: { title: '자동차 판매' }, B: { title: '반도체 생산' },
    C: { title: '반도체 장비', related: [{ code: 'D' }, { code: 'NOT_HELD' }] },
    D: { title: '은행 실적' }, E: { related: [{ code: 'C' }] } };
  const columns = newsColumns(stocks, briefs, 'C');
  assert.equal(newsColumns(stocks, briefs)[0].theme, '반도체', 'semiconductors come first in the overview');
  assert.equal(columns[0].theme, '반도체');
  assert.deepEqual(columns.filter(column => column.priority).flatMap(column => column.stocks.map(stock => stock.code)), ['B', 'D', 'E']);
  assert.deepEqual(columns.flatMap(column => column.stocks.map(stock => stock.code)), ['B', 'D', 'E', 'A']);
  assert.ok(newsColumns(stocks, {}, 'C').every(column => column.theme !== '연관 종목'));
});

test('cross-theme connections bring columns and linked rows together while semiconductors stay leftmost', async () => {
  const { newsColumns } = await server.ssrLoadModule('/src/utils/newsThemes.js');
  const stocks = ['S1', 'S2', 'A', 'B', 'E1', 'E2'].map(code => ({ code }));
  const briefs = { S1: { title: '반도체 생산' }, S2: { title: '반도체 장비' },
    A: { title: '자동차 판매' }, B: { title: '바이오 임상' },
    E1: { title: '배터리 투자' }, E2: { title: '배터리 생산', related: [{ code: 'S1' }] } };
  const columns = newsColumns(stocks, briefs);
  assert.equal(columns[0].theme, '반도체');
  assert.equal(columns[1].theme, '배터리 · 에너지');
  assert.equal(columns[0].stocks.findIndex(stock => stock.code === 'S1'), columns[1].stocks.findIndex(stock => stock.code === 'E2'));
  assert.deepEqual(columns.flatMap(column => column.stocks.map(stock => stock.code)).sort(), stocks.map(stock => stock.code).sort());
  assert.deepEqual(newsColumns(stocks, briefs), columns, 'layout stays deterministic');
});

test('holdings without news or with failed news requests keep their stock information', async () => {
  newsAdapter = async config => {
    if (codeOf(config) === '000660') throw new Error('private-upstream');
    return ok(config, { ...publicBrief(), ai_available: false, title: null,
      recent_issues: [], positive_factors: [], risk_factors: [], evidence: [] });
  };
  await render({ holdings: holdings.map(stock => ({ ...stock, quote: { current_price: 42000 } })) });
  assert.equal(container.querySelectorAll('[data-news-card]').length, 2);
  const first = byLabel('테스트전자 뉴스 요약 열기');
  assert.match(first.textContent, /최근 확인되는 뉴스가 없어요/);
  assert.doesNotMatch(first.textContent, /50,000원|10주 보유/);
  assert.doesNotMatch(byLabel('테스트반도체 뉴스 요약 열기').textContent, /42,000|2주 보유/);
  await press(first);
  assert.match(container.querySelector('.portfolio-news-detail').textContent, /50,000원.*10주 보유/);
  await press(byLabel('테스트반도체 뉴스 요약 열기'));
  assert.match(container.querySelector('.portfolio-news-detail').textContent, /42,000.*2주 보유/);
  assert.ok(buttons().find(button => button.textContent === '다시 불러오기'));
  assert.doesNotMatch(container.textContent, /private-upstream/);
});
