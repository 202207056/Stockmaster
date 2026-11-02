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
  assert.equal(dialog.querySelectorAll('.trading-news-sections > section').length, 4);
  assert.match(dialog.querySelector('.trading-news-main header').textContent, /10주 보유/);
  assert.match(dialog.textContent, /SK하이닉스 근거 기사/);
  assert.match(dialog.textContent, /11\.2\(월\) 12:40 생성/);
  const relatedCards = [...dialog.querySelectorAll('.trading-news-related-card')];
  assert.equal(relatedCards.length, 4);
  assert.deepEqual(relatedCards.map(card => card.textContent.includes('보유')), [true, false, true, false]);
  assert.match(relatedCards[1].textContent, /관련 기사 없음/);
  for (const [name, held] of [['삼성전자', true], ['DB하이텍', false], ['한미반도체', true], ['HPSP', false], ['SK하이닉스', true]]) {
    await React.act(async () => dialog.querySelector(`[aria-label="${name} 뉴스 상세 보기"]`).click());
    const detail = dialog.querySelector('.trading-news-main');
    assert.equal(detail.querySelector('h3').textContent, name);
    assert.equal(detail.querySelector('header').textContent.includes('주 보유'), held);
    assert.equal(document.activeElement, detail);
    assert.equal(dialog.querySelectorAll('.trading-news-related-card').length, 4);
    assert.equal(banner.querySelector('.trading-news-banner__headline').textContent, main.title);
  }
  assert.equal(calls.filter(url => url === '/ai/stock-brief/000660').length, 1);
  assert.match(dialog.textContent, /오늘의 테마/);
  assert.match(dialog.textContent, /AI 데이터센터 협력 논의/);
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

test('unsafe evidence links are shown as text only', async () => {
  serve({ '/ai/stock-brief/000660': config => response(config, { ...main,
    evidence: [{ title: '안전하지 않은 링크', source: null, url: 'javascript:alert(1)', published_at: null }] }) });
  await render();
  await React.act(async () => document.querySelector('.trading-news-banner').click());
  assert.match(document.body.textContent, /안전하지 않은 링크/);
  assert.equal(document.querySelector('.trading-news-evidence a'), null);
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
  await React.act(async () => tabs()[1].click());
  const panel = dialog.querySelector('.trading-news-main');
  assert.equal(panel.getAttribute('aria-label'), 'AI 인프라 테마 상세');
  assert.equal(document.activeElement, panel);
  assert.match(panel.textContent, /상승 6 · 하락 2 \/ 8종목/);
  assert.match(panel.textContent, /AI 데이터센터 협력 논의/);
  assert.equal(panel.querySelector('.trading-news-evidence a').getAttribute('href'), 'https://n.news.naver.com/t');
  assert.match(panel.textContent, /98,000원/);
  assert.match(panel.querySelector('.trading-news-leaders').textContent, /보유/);
  assert.equal(dialog.querySelectorAll('.trading-news-related-card').length, 5, 'related cards include the page stock while a theme is shown');
  await React.act(async () => panel.querySelector('[aria-label="삼성전자 뉴스 상세 보기"]').click());
  assert.equal(dialog.querySelector('.trading-news-main h3').textContent, '삼성전자');
  assert.deepEqual(tabs().map(tab => tab.getAttribute('aria-pressed')), ['true', 'false', 'false']);
  assert.equal(tabs()[0].textContent.trim(), '▲ 삼성전자');
  const fallingHeader = [...dialog.querySelectorAll('.trading-news-themes h4 button')].find(item => item.textContent.includes('2차전지'));
  await React.act(async () => fallingHeader.click());
  assert.equal(tabs()[2].getAttribute('aria-pressed'), 'true');
  assert.equal(dialog.querySelector('.trading-news-main').getAttribute('aria-label'), '2차전지 테마 상세');
  await React.act(async () => tabs()[0].click());
  assert.equal(dialog.querySelector('.trading-news-main h3').textContent, '삼성전자');
  assert.equal(calls.filter(url => url === '/ai/theme-brief').length, 1);
});
