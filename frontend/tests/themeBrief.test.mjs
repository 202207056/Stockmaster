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
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', envFile: false });
after(async () => { await server.close(); dom.window.close(); });
const { default: Card } = await server.ssrLoadModule('/src/components/ai/ThemeBriefCard.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { SitePracticeContext } = await server.ssrLoadModule('/src/contexts/site-practice.js');
const { fetchThemeBrief } = await server.ssrLoadModule('/src/api/data.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const disclaimer = '기사 제목을 바탕으로 한 요약이며 전망이나 투자 조언이 아닙니다.';
function theme(id = '608', reason = '코스피 급락 소식과 함께 약세였어요.') {
  return { id, name: `반도체 ${id}`, change_rate: -9.87,
    rise_count: 0, fall_count: 14, steady_count: 0, total_count: 14,
    leaders: [{ code: '353200', name: '대덕전자', price: 116400, change_rate: -15.77 }],
    reason, evidence: reason ? [{ title: '코스피 급락', source: '가상신문',
      url: 'https://example.invalid/news', published_at: '2026-10-30T12:13:57Z' }] : [] };
}
function brief(overrides = {}) {
  return { source: '네이버 증권', as_of: '2026-10-30T11:20:23Z', generated_at: '2026-10-31T08:09:27+09:00',
    rising: [{ ...theme('1', null), change_rate: 1.2 }], falling: [theme()], disclaimer, ...overrides };
}
function response(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} }; }
let root;
let calls = 0;
function mock(data = brief()) {
  calls = 0;
  client.default.defaults.adapter = async config => {
    if (config.url.includes('/logo')) return response(config, { symbol_code: '353200', logo_url: null });
    assert.equal(config.url, '/ai/theme-brief');
    calls++;
    assert.equal(config.headers.Authorization, 'Bearer theme-test');
    return response(config, data);
  };
}
async function render({ authenticated = true, practice = null, strict = false } = {}) {
  root ??= createRoot(container);
  const tree = React.createElement(AuthContext.Provider, { value: {
    isAuthenticated: authenticated, user: authenticated ? { user_id: 7 } : null,
  } }, React.createElement(SitePracticeContext.Provider, { value: practice },
    React.createElement(MemoryRouter, null, React.createElement(Card))));
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, tree) : tree));
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  client.clearToken();
  client.default.defaults.adapter = async () => assert.fail('Unexpected HTTP attempt');
});

// 모든 HTTP 요청은 메모리 adapter로 처리한다.
test('authenticated card uses one Backend GET, KST time, signed two-digit rates and disclosure links', async () => {
  client.setToken('theme-test'); mock();
  await render();
  assert.equal(calls, 1);
  assert.match(container.textContent, /오늘의 테마/);
  assert.match(container.textContent, /네이버 증권 · 20:20 기준/);
  assert.match(container.textContent, /상승 0 · 하락 14 \/ 14종목/);
  assert.match(container.textContent, /\+1\.20%/);
  assert.match(container.textContent, /-9\.87%/);
  assert.match(container.textContent, /116,400원/);
  assert.match(container.textContent, /-15\.77%/);
  assert.match(container.textContent, new RegExp(disclaimer));
  const buttons = container.querySelectorAll('h4 button');
  assert.equal(buttons[0].getAttribute('aria-expanded'), 'false', 'null reason stays collapsed');
  assert.equal(buttons[1].getAttribute('aria-expanded'), 'true', 'first reason starts expanded');
  assert(container.querySelector('a[href="/trading?code=353200"]'));
  const article = container.querySelector('a[href="https://example.invalid/news"]');
  assert.equal(article.target, '_blank');
  assert.equal(article.rel, 'noopener noreferrer');
  assert.match(container.textContent, /가상신문/);
  await act(async () => buttons[1].click());
  assert.equal(buttons[1].getAttribute('aria-expanded'), 'false');
  assert.equal(container.querySelector('a[href="/trading?code=353200"]'), null);
  await act(async () => buttons[0].click());
  assert.equal(buttons[0].getAttribute('aria-expanded'), 'true');
  assert.equal(container.querySelectorAll('article p').length, 1, 'null reason has no AI line');
  assert.equal(calls, 1, 'expanding does not request theme briefing');
  await act(async () => window.dispatchEvent(new dom.window.Event('online')));
  await render();
  assert.equal(calls, 1, 'no online retry or rerender request');
});

test('no reason means all themes collapsed and no AI text line', async () => {
  client.setToken('theme-test'); mock(brief({ rising: [], falling: [theme('1', null), theme('2', null)] }));
  await render();
  assert.equal(container.querySelectorAll('article p').length, 0);
  assert([...container.querySelectorAll('h4 button')].every(button => button.getAttribute('aria-expanded') === 'false'));
});

for (const empty of ['rising', 'falling']) test(`empty ${empty} column keeps other column and friendly message`, async () => {
  client.setToken('theme-test'); mock(brief({ [empty]: [] }));
  await render();
  assert.match(container.textContent, new RegExp(empty === 'rising' ? '오늘은 많이 오른 테마가 없어요' : '오늘은 많이 내린 테마가 없어요'));
  assert.equal(container.querySelectorAll('article').length, 1);
});

test('both empty columns hide entire card', async () => {
  client.setToken('theme-test'); mock(brief({ rising: [], falling: [] }));
  await render(); assert.equal(container.innerHTML, '');
});

for (const status of [401, 403, 503]) test(`${status} hides card without retry or raw error`, async () => {
  client.setToken('theme-test'); calls = 0;
  client.default.defaults.adapter = async config => {
    calls++;
    throw Object.assign(new Error('private upstream detail'), { response: { status }, config });
  };
  await render(); assert.equal(container.innerHTML, ''); assert.equal(calls, 1);
});

test('anonymous and practice views never request and hide card', async () => {
  client.default.defaults.adapter = async () => assert.fail('Must not request');
  await render({ authenticated: false }); assert.equal(container.innerHTML, '');
  await render({ practice: {} }); assert.equal(container.innerHTML, '');
});

test('loading skeleton disappears after logout and ignores late response', async () => {
  client.setToken('theme-test');
  let finish;
  client.default.defaults.adapter = config => new Promise(resolve => { finish = () => resolve(response(config, brief())); });
  await render(); assert(container.querySelector('[role="status"]'));
  await render({ authenticated: false }); assert.equal(container.innerHTML, '');
  await act(async () => finish()); assert.equal(container.innerHTML, '');
});

test('StrictMode sends one request without effect retry', async () => {
  client.setToken('theme-test'); mock();
  await render({ strict: true }); assert.equal(calls, 1);
});

test('helper passes signal and rejects malformed contract without rendering unsafe links', async () => {
  client.setToken('theme-test');
  const controller = new AbortController();
  client.default.defaults.adapter = async config => {
    assert.equal(config.signal, controller.signal);
    return response(config, brief({ falling: [{ ...theme(), evidence: [{ title: '안전하지 않은 주소', url: 'javascript:alert(1)' }] }] }));
  };
  const data = await fetchThemeBrief(controller.signal);
  mock(data); await render();
  assert.equal(container.querySelector('a[href^="javascript:"]'), null);
  for (const invalid of [{}, brief({ rising: null }), brief({ as_of: 'invalid' })]) {
    client.clearRequestCache();
    client.default.defaults.adapter = async config => response(config, invalid);
    await assert.rejects(fetchThemeBrief());
  }
});
