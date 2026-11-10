import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', envFile: false });
const { default: Brief } = await server.ssrLoadModule('/src/components/common/TradingNewsBrief.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const client = await server.ssrLoadModule('/src/api/client.js');
after(async () => { await server.close(); dom.window.close(); });

const peers = [
  { code: '005930', name: '삼성전자', price: 98000, change_rate: -4.96, title: '메모리 공급 협력 논의' },
  { code: '000990', name: 'DB하이텍', price: 51000, change_rate: 2.23, title: null },
  { code: '042700', name: '한미반도체', price: 181300, change_rate: -2.23, title: 'HBM 장비 수요 주목' },
  { code: '403870', name: 'HPSP', price: 30000, change_rate: -2.23, title: null },
];
function stockBrief(code, name, changeRate, extra = {}) {
  return { symbol_code: code, name, price: 1000, change_rate: changeRate, as_of: '2026-10-30T15:30:00+09:00',
    generated_at: '2026-11-02T12:40:00+09:00', ai_available: true, title: `${name} 주요 이슈`,
    recent_issues: [`${name} 최근 이슈입니다.`], positive_factors: [`${name} 긍정 요인입니다.`], risk_factors: [`${name} 주의 요인입니다.`],
    citations: { [`${name} 최근 이슈입니다.`]: [{ title: `${name} 근거 기사`, source: '연합뉴스', url: 'https://n.news.naver.com/a' }] },
    evidence: [{ title: `${name} 근거 기사`, source: '연합뉴스', url: 'https://n.news.naver.com/a', published_at: '2026-10-30T16:00:00+09:00' }],
    related: [], source: '네이버 증권', disclaimer: '기사 제목을 바탕으로 한 요약이며 전망이나 투자 조언이 아닙니다.', ...extra };
}
const main = stockBrief('000660', 'SK하이닉스', -8.85, { title: '코스피 급락·하이닉스 8%대 하락', related: peers });
const themes = { source: '네이버 증권', as_of: '2026-11-02T12:00:00+09:00', disclaimer: '테마 안내',
  rising: [{ id: '1', name: 'AI 인프라', change_rate: 2.23, rise_count: 6, fall_count: 2, total_count: 8,
    reason: 'AI 데이터센터 협력 논의가 이어졌어요.', leaders: [], evidence: [] }], falling: [] };
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
let calls;
function serve(overrides = {}) {
  calls = [];
  client.clearRequestCache();
  client.default.defaults.adapter = async config => {
    calls.push(config.url);
    if (overrides[config.url]) return overrides[config.url](config);
    if (config.url === '/ai/stock-brief/000660') return response(config, main);
    const peer = peers.find(stock => config.url === `/ai/stock-brief/${stock.code}`);
    if (peer) return response(config, stockBrief(peer.code, peer.name, peer.change_rate));
    if (config.url === '/trading/portfolio') return response(config, { holdings: [
      { symbol_code: '000660', hold_quantity: 10 }, { symbol_code: '005930', hold_quantity: 5 }, { symbol_code: '042700', hold_quantity: 2 }] });
    if (config.url === '/ai/theme-brief') return response(config, themes);
    if (config.url === '/ai/portfolio-briefs') return response(config, { items: [] });
    throw new Error(`Unexpected ${config.url}`);
  };
}
const auth = { isAuthenticated: true, accountId: 7, user: { user_id: 1 } };
let root;
async function render(value = auth) {
  root ??= createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value },
    React.createElement(Brief, { code: '000660' })))));
}
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  localStorage.clear();
  client.clearRequestCache?.();
});

test('banner opens the real briefing, related stocks load their own briefing, Escape restores focus and scroll', async () => {
  serve();
  await render();
  const banner = document.querySelector('.trading-news-banner');
  assert.equal(banner.querySelector('.trading-news-banner__label').textContent, '왜 내렸을까?');
  assert.equal(banner.querySelector('.trading-news-banner__headline').textContent, main.title);
  banner.focus();
  await React.act(async () => banner.click());
  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog);
  assert.ok(dialog.previousElementSibling.classList.contains('bg-transparent'));
  dialog.getBoundingClientRect = () => {
    const [dx, dy] = (dialog.style.transform.match(/-?\d+(?:\.\d+)?/g) || [0, 0]).map(Number);
    return { left: 200 + dx, top: 100 + dy, width: 600, height: 400 };
  };
  const handle = dialog.querySelector('[aria-label="AI 뉴스 팝업 이동"]');
  const pointer = (type, x, y) => {
    const event = new dom.window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    handle.dispatchEvent(event);
  };
  await React.act(async () => { pointer('pointerdown', 250, 120); pointer('pointermove', 290, 150); pointer('pointerup', 290, 150); });
  assert.equal(dialog.style.transform, 'translate(40px, 30px)');
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(dialog.querySelector('.trading-news-summary p').textContent, main.title);
  assert.equal(dialog.querySelectorAll('.shared-news-copy').length, 1);
  assert.deepEqual([...dialog.querySelectorAll('.shared-news-section h4')].map(item => item.textContent),
    ['최근 확인되는 뉴스', '긍정적으로 볼 수 있는 요인', '주의해서 볼 수 있는 요인']);
  assert.equal(dialog.querySelectorAll('.shared-news-sources').length, 0);
  assert.doesNotMatch(dialog.textContent, /주 보유|투자 흐름|앞으로 확인할 점/);
  assert.ok(!calls.includes('/trading/portfolio'));
  assert.equal(dialog.querySelector('.shared-news-copy li a').title, 'SK하이닉스 근거 기사');
  assert.equal(dialog.querySelector('.trading-news-main .trading-news-footnote'), null);
  const relatedCards = [...dialog.querySelectorAll('[data-news-card]')];
  assert.equal(relatedCards.length, 4);
  assert.ok(relatedCards.every(card => card.querySelector('button > span')?.textContent.trim()));
  assert.ok(relatedCards.every(card => !card.textContent.includes('보유')));
  for (const name of ['삼성전자', 'DB하이텍', '한미반도체', 'HPSP', 'SK하이닉스']) {
    await React.act(async () => dialog.querySelector(`[aria-label="${name} 뉴스 요약 열기"]`).click());
    const detail = dialog.querySelector('.trading-news-main');
    assert.equal(detail.querySelector('h3').textContent, name);
    assert.equal(detail.querySelector('header').textContent.includes('주 보유'), false);
    assert.equal(document.activeElement, detail);
    assert.equal(dialog.querySelectorAll('[data-news-card]').length, 4);
    assert.equal(banner.querySelector('.trading-news-banner__headline').textContent, main.title);
  }
  assert.equal(calls.filter(url => url === '/ai/stock-brief/000660').length, 1);
  assert.equal(dialog.querySelector('.trading-news-theme-stocks'), null, 'unrelated themes do not occupy a sidebar');
  assert.match(dialog.querySelector('[aria-label="오늘의 테마 AI 분석"]').textContent, /오늘의 테마/);
  await React.act(async () => dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.body.style.overflow, '');
  assert.equal(document.activeElement, banner);
});

test('guests, unavailable briefings and failures without a saved copy render nothing', async () => {
  serve();
  await render({ isAuthenticated: false, accountId: null, user: null });
  assert.equal(document.querySelector('.trading-news-banner'), null);
  assert.deepEqual(calls, []);
  await React.act(async () => root.unmount());
  root = null;
  serve({ '/ai/stock-brief/000660': config => response(config, { ...main, ai_available: false, title: null }) });
  await render();
  assert.equal(document.querySelector('.trading-news-banner'), null);
  await React.act(async () => root.unmount());
  root = null;
  localStorage.clear();
  serve({ '/ai/stock-brief/000660': config => { throw Object.assign(new Error('PRIVATE'), { config, response: { status: 503 } }); } });
  await render();
  assert.equal(document.querySelector('.trading-news-banner'), null);
  assert.doesNotMatch(document.body.textContent, /PRIVATE/);
});

test('browser copy shows at once while the server answers, and survives a failed refresh', async () => {
  serve();
  await render();
  await React.act(async () => root.unmount());
  root = null;
  let release;
  serve({ '/ai/stock-brief/000660': config => new Promise(resolve => { release = () => resolve(response(config, { ...main, title: '갱신된 제목' })); }) });
  await render();
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, main.title);
  await React.act(async () => release());
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, '갱신된 제목');
  await React.act(async () => root.unmount());
  root = null;
  serve({ '/ai/stock-brief/000660': config => { throw Object.assign(new Error('offline'), { config }); } });
  await render();
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, '갱신된 제목');
});

test('legacy summaries show their saved article links beside every news sentence', async () => {
  serve({ '/ai/stock-brief/000660': config => response(config, { ...main, citations: {} }) });
  await render();
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  const lines = [...document.querySelectorAll('.shared-news-copy li')];
  assert.equal(lines.length, 3);
  for (const line of lines) {
    assert.equal(line.querySelector('a').href, main.evidence[0].url);
    assert.equal(line.querySelectorAll('a').length, 1);
    assert.equal(line.querySelector('a').textContent, '연합뉴스 ↗');
  }
  assert.equal(document.querySelector('.shared-news-sources'), null);
});

test('an open AI news view immediately follows the shared portfolio snapshot and rejects older responses', async () => {
  const { publishStockBrief, rememberPortfolioHeadline } = await server.ssrLoadModule('/src/api/stockBriefCache.js');
  serve();
  await render();
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  // 요약이 없는 스냅샷에서는 보유종목 제목 유지 규칙을 그대로 따른다.
  const newer = { ...main, title: '공통 제목 갱신',
    recent_issues: ['새 공통 뉴스 본문'], generated_at: '2026-11-03T12:40:00+09:00' };
  await React.act(async () => publishStockBrief(newer));
  assert.equal(document.querySelector('.trading-news-summary p').textContent, newer.title);
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, newer.title);
  assert.match(document.querySelector('.shared-news-copy').textContent, /새 공통 뉴스 본문/);
  await React.act(async () => publishStockBrief(main));
  assert.equal(document.querySelector('.trading-news-summary p').textContent, newer.title);
  const originalHeadline = '기존 보유종목 요약 제목';
  await React.act(async () => publishStockBrief({ ...newer, title: originalHeadline, portfolio_headline: originalHeadline }));
  assert.equal(document.querySelector('.trading-news-summary p').textContent, originalHeadline);
  await React.act(async () => publishStockBrief(newer));
  assert.equal(document.querySelector('.trading-news-summary p').textContent, originalHeadline, 'the stock response must preserve the portfolio title for the same snapshot');
  await React.act(async () => rememberPortfolioHeadline({ symbol_code: main.symbol_code, headline: originalHeadline,
    generated_at: '2026-11-01T12:00:00+09:00' }));
  await React.act(async () => publishStockBrief({ ...newer, generated_at: '2026-11-04T12:40:00+09:00' }));
  assert.equal(document.querySelector('.trading-news-summary p').textContent, originalHeadline, 'legacy portfolio title survives a newer public snapshot');
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, newer.title, 'the banner keeps its original public summary');
});

test('server stock headline restores the original banner even when the saved banner was overwritten', async () => {
  const { writeResource, resourceKey } = await server.ssrLoadModule('/src/api/resourceCache.js');
  writeResource(resourceKey('stock-brief', null, main.symbol_code), { ...main,
    title: '기존 보유종목 본문 제목', portfolio_headline: '기존 보유종목 본문 제목',
    banner_title: '잘못 덮인 배너 제목', banner_summary: '새로 만든 요약' }, true);
  serve();
  await render();
  // 잘못 덮인 배너 제목은 쓰지 않고, 같은 스냅샷에 남아 있던 한 줄 요약이 배너와 상세 제목이 된다.
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, '새로 만든 요약');
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  assert.equal(document.querySelector('.trading-news-summary p').textContent, '새로 만든 요약');
});

test('a summary with a detail title is shown on the banner and the detail header with its tone', async () => {
  const { publishStockBrief } = await server.ssrLoadModule('/src/api/stockBriefCache.js');
  serve();
  await render();
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  await React.act(async () => publishStockBrief({ ...main, title: '공통 제목', banner_summary: 'HBM 증설 지연 시 자금 부담',
    banner_detail: 'HBM 증설이 늦어지면 소부장 업체의 자금 부담이 커질 수 있다는 우려가 나왔습니다.', banner_tone: '악재',
    generated_at: '2026-11-05T12:40:00+09:00' }));
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, 'HBM 증설 지연 시 자금 부담');
  const header = document.querySelector('.trading-news-summary p');
  assert.match(header.textContent, /^HBM 증설이 늦어지면 소부장 업체의 자금 부담이 커질 수 있다는 우려가 나왔습니다\./);
  // 주가가 내렸으므로 악재 칩은 그대로 '악재'로 보인다.
  assert.equal(header.querySelector('.banner-tone').textContent, '악재');
});

test('a detail title is dropped when a saved holding summary replaces the shared summary', async () => {
  const { publishStockBrief, rememberPortfolioHeadline } = await server.ssrLoadModule('/src/api/stockBriefCache.js');
  const shared = { ...main, banner_summary: '공용 요약', banner_detail: '공용 요약을 자세히 풀어 쓴 상세 제목입니다.' };
  const same = { symbol_code: main.symbol_code, headline: '보유종목 제목', generated_at: main.generated_at };
  rememberPortfolioHeadline({ ...same, banner_summary: '공용 요약' });
  assert.equal(publishStockBrief(shared).banner_detail, shared.banner_detail);
  rememberPortfolioHeadline({ ...same, banner_summary: '보유종목 요약' });
  const mixed = publishStockBrief(shared);
  assert.equal(mixed.banner_summary, '보유종목 요약');
  assert.equal(mixed.banner_detail, null);
});

test('related cards show their relation to the opened stock, and only for that stock', async () => {
  const relations = { '005930': '고객사', '042700': 'HBM 장비 제조사', '403870': '동종업체' };
  serve({ '/ai/stock-brief/000660': config => response(config, { ...main,
    related: peers.map(stock => ({ ...stock, relation: relations[stock.code] ?? null })) }) });
  await render();
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  const relationOf = code => document.querySelector(`[data-news-card="${code}"] .portfolio-news-banner-relation`)?.textContent ?? null;
  // 고객사·동종업체는 누구 기준인지 붙이고, 제조사·업체는 그대로 쓴다. 관계가 없으면 줄을 만들지 않는다.
  assert.equal(relationOf('005930'), 'SK하이닉스의 고객사');
  assert.equal(relationOf('042700'), 'HBM 장비 제조사');
  assert.equal(relationOf('403870'), 'SK하이닉스의 동종업체');
  assert.equal(relationOf('000990'), null);
  // 다른 종목을 펼치면 SK하이닉스 기준 관계는 더 이상 붙지 않는다.
  await React.act(async () => document.querySelector('[aria-label="삼성전자 뉴스 요약 열기"]').click());
  assert.equal(document.querySelectorAll('.portfolio-news-banner-relation').length, 0);
});

test('unsafe evidence links are shown as text only', async () => {
  serve({ '/ai/stock-brief/000660': config => response(config, { ...main,
    citations: { [main.recent_issues[0]]: [{ title: '안전하지 않은 링크', source: '출처', url: 'javascript:alert(1)' }] },
    evidence: [{ title: '안전하지 않은 링크', source: null, url: 'javascript:alert(1)', published_at: null }] }) });
  await render();
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  assert.equal(document.querySelector('.shared-news-copy .portfolio-brief-cite').title, '안전하지 않은 링크');
  assert.equal(document.querySelector('.shared-news-copy a'), null);
  await React.act(async () => document.querySelector('[aria-label="닫기"]').click());
});

test('theme tabs show a top theme in the main panel, leaders open their briefing, the theme column selects the same tab', async () => {
  const themed = { ...themes,
    rising: [{ ...themes.rising[0], leaders: [{ code: '005930', name: '삼성전자', price: 98000, change_rate: 1.2 }],
      evidence: [{ title: 'AI 인프라 근거 기사', source: '한경', url: 'https://n.news.naver.com/t', published_at: null }] }],
    falling: [{ id: '2', name: '2차전지', change_rate: -3.1, rise_count: 1, fall_count: 9, total_count: 10,
      reason: '원자재 가격 부담이 이어졌어요.', leaders: [], evidence: [] }] };
  serve({ '/ai/theme-brief': config => response(config, themed) });
  await render();
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  const dialog = document.querySelector('[role="dialog"]');
  const tabs = () => [...dialog.querySelectorAll('[aria-label="뉴스 보기 선택"] button')];
  assert.deepEqual(tabs().map(tab => tab.textContent.trim()), ['▼ SK하이닉스', '▲ AI 인프라', '▼ 2차전지']);
  assert.deepEqual(tabs().map(tab => tab.getAttribute('aria-pressed')), ['true', 'false', 'false']);
  assert.ok(dialog.querySelector('.portfolio-news-workspace.is-expanded'));
  assert.ok(dialog.querySelector('[data-news-card="005930"] button'));
  await React.act(async () => tabs()[1].click());
  const panel = dialog.querySelector('.trading-news-main');
  assert.equal(panel.getAttribute('aria-label'), 'AI 인프라 테마 상세');
  assert.equal(document.activeElement, panel);
  assert.match(panel.textContent, /상승 6 · 하락 2 \/ 8종목/);
  assert.match(panel.textContent, /AI 데이터센터 협력 논의/);
  assert.equal(panel.querySelector('.trading-news-evidence a').getAttribute('href'), 'https://n.news.naver.com/t');
  assert.match(panel.textContent, /98,000원/);
  assert.doesNotMatch(panel.querySelector('.trading-news-leaders').textContent, /보유/);
  await React.act(async () => panel.querySelector('[aria-label="삼성전자 뉴스 상세 보기"]').click());
  assert.equal(dialog.querySelector('.trading-news-main h3').textContent, '삼성전자');
  assert.deepEqual(tabs().map(tab => tab.getAttribute('aria-pressed')), ['true', 'false', 'false']);
  assert.equal(tabs()[0].textContent.trim(), '▲ 삼성전자');
  await React.act(async () => tabs()[2].click());
  assert.equal(tabs()[2].getAttribute('aria-pressed'), 'true');
  assert.equal(dialog.querySelector('.trading-news-main').getAttribute('aria-label'), '2차전지 테마 상세');
  await React.act(async () => tabs()[0].click());
  assert.equal(dialog.querySelector('.trading-news-main h3').textContent, '삼성전자');
  assert.equal(calls.filter(url => url === '/ai/theme-brief').length, 1);
});

test('the stock briefing can be reported with its identifiers only', async () => {
  let body;
  serve({ '/ai/brief-reports': config => { body = JSON.parse(config.data); return response(config, { id: 1, created_at: main.generated_at }); } });
  await render();
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  const detail = document.querySelector('.trading-news-main');
  await React.act(async () => [...detail.querySelectorAll('button')].find(item => item.textContent === '신고하기').click());
  await React.act(async () => detail.querySelector('form[aria-label="브리핑 신고"] button[type="submit"]').click());
  assert.deepEqual(body, { kind: 'stock', symbol_code: '000660', generated_at: main.generated_at, account_id: null, reason: 'wrong_fact', note: null });
  assert.match(detail.textContent, /신고가 접수됐어요/);
});

test('missing title uses the shared news body and never an account-specific saved headline', async () => {
  serve({ '/ai/stock-brief/000660': config => response(config, { ...main, title: null }) });
  await render();
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, main.recent_issues[0]);
  assert.ok(!calls.includes('/ai/portfolio-briefs'));
  await render({ ...auth, accountId: 8 });
  assert.equal(document.querySelector('.trading-news-banner__headline').textContent, main.recent_issues[0]);
});
