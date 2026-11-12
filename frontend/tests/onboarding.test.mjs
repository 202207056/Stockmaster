import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, CustomEvent: dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class { observe() {} disconnect() {} } });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.scrollTo = () => {};
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: Tour } = await server.ssrLoadModule('/src/components/learn/SiteTour.jsx');
const { default: Landing } = await server.ssrLoadModule('/src/pages/Landing.jsx');
const { SITE_TOUR_STEPS } = await server.ssrLoadModule('/src/constants/siteTour.js');
const { default: SeedMoney } = await server.ssrLoadModule('/src/pages/SeedMoney.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const { default: Survey } = await server.ssrLoadModule('/src/pages/Survey.jsx');
const { default: Signup } = await server.ssrLoadModule('/src/pages/Signup.jsx');
const { default: AuthProvider } = await server.ssrLoadModule('/src/contexts/AuthContext.jsx');
const { default: Gate } = await server.ssrLoadModule('/src/components/routing/OnboardingGate.jsx');
const onboarding = await server.ssrLoadModule('/src/utils/onboarding.js');
const h = React.createElement;
function Location() { const location = useLocation(); return h('output', null, location.pathname + location.search); }
const click = async label => {
  const button = [...document.querySelectorAll('button')].find(el => el.textContent === label);
  assert(button, label);
  await React.act(async () => button.click());
};

test('landing account actions follow session restoration, login and logout', async () => {
  const root = createRoot(document.getElementById('root'));
  let loggedOut = false;
  const render = async (status, user = null) => React.act(async () => root.render(
    h(MemoryRouter, null, h(AuthContext.Provider, { value: {
      status, user, isAuthenticated: status === 'authenticated', logout: () => { loggedOut = true; },
    } }, h(Landing)))));
  try {
    for (const status of ['loading', 'error']) {
      await render(status);
      assert.equal(document.querySelector('a[href="/signup"]'), null);
      assert(!document.querySelector('header').textContent.includes('가입'));
    }
    await render('authenticated', { user_name: '테스트회원' });
    assert.equal(document.querySelector('header a[href="/mypage"]').textContent, '테스트회원님');
    assert.equal(document.querySelector('a[href="/login"]'), null);
    assert.equal(document.querySelector('a[href="/signup"]'), null);
    assert([...document.querySelectorAll('a')].some(link => link.textContent === '투자 이어하기' && link.getAttribute('href') === '/dashboard'));
    await click('로그아웃');
    assert(loggedOut);
    await render('unauthenticated');
    assert(document.querySelector('header a[href="/login"]'));
    assert(document.querySelector('header a[href="/signup"]'));
    assert.equal(document.querySelector('header a[href="/mypage"]'), null);
  } finally {
    await React.act(async () => root.unmount());
  }
});

test('landing browse immediately opens the introduction only when tutorial guidance is enabled', async () => {
  for (const enabled of [true, false]) {
    localStorage.setItem('stockmaster:tutorials-enabled', String(enabled));
    const root = createRoot(document.getElementById('root'));
    try {
      await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/'] },
        h(AuthContext.Provider, { value: { user: null, isAuthenticated: false, status: 'unauthenticated' } },
          h(Routes, null,
            h(Route, { path: '/', element: h(Landing) }),
            h(Route, { path: '/dashboard', element: h(Tour) }))), h(Location))));
      const browse = [...document.querySelectorAll('a')].find(link => link.textContent.trim() === '둘러보기');
      assert(browse);
      await React.act(async () => browse.click());
      assert.equal(document.querySelector('output').textContent, enabled ? '/dashboard?tour=start' : '/dashboard');
      assert.equal(Boolean(document.querySelector('.site-tour-intro')?.open), enabled);
      if (enabled) {
        await click('시작하기');
        assert.equal(document.querySelector('output').textContent, '/dashboard?tour=0');
        assert(document.querySelector('.site-tour-note'));
      }
    } finally { await React.act(async () => root.unmount()); }
  }
  localStorage.removeItem('stockmaster:tutorials-enabled');
});

test('tour visits all real routes, supports previous and closes on completion', async () => {
  onboarding.setOnboarding(100, 'tour:0');
  const links = document.createElement('div');
  links.innerHTML = '<nav aria-label="주 메뉴">' + ['/trading', '/assets', '/community', '/learn'].map(path => `<a href="${path}">${path}</a>`).join('') + '</nav><section data-site-tour="favorites"><a href="/favorites">관심종목 ></a></section>';
  document.body.prepend(links);
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/dashboard?tour=0'] }, h(AuthContext.Provider, { value: { user: { user_id: 100 }, isAuthenticated: true } }, h(Gate, null, h(Tour))), h(Location))));
    assert(document.querySelector('.site-tour-note'));
    assert(!document.querySelector('dialog, [aria-modal=true]'));
    await click('다음');
    assert.equal(document.querySelector('output').textContent, '/dashboard?tour=1');
    await click('뒤로가기');
    assert.equal(document.querySelector('output').textContent, '/dashboard?tour=0');
    for (let i = 0; i < SITE_TOUR_STEPS.length - 1; i++) {
      const step = SITE_TOUR_STEPS[i];
      if (step.clickSelector) {
        assert.equal(document.querySelector('.assets-tour-pointer .tutorial-pointer').textContent, '여기를 클릭');
        assert(!document.querySelector('.site-tour-note').textContent.includes('여기를 클릭'));
        assert.equal(document.querySelector('.site-tour-note .tutorial-action'), null);
        await React.act(async () => document.querySelector('.site-tour-note').click());
        assert.equal(document.querySelector('output').textContent, `${step.path}?tour=${i}`, 'callout cannot bypass the required link');
        await React.act(async () => document.querySelector(step.clickSelector).click());
      } else await click('다음');
      assert.equal(document.querySelector('output').textContent, `${SITE_TOUR_STEPS[i + 1].path}?tour=${i + 1}`);
      assert.equal(onboarding.getOnboarding(100), `tour:${i + 1}`);
    }
    await click('다음');
    assert(!document.querySelector('.site-tour-note'));
    assert.equal(document.querySelector('output').textContent, '/dashboard');
  } finally { await React.act(async () => root.unmount()); links.remove(); }
});

test('AI news tour keeps the selected stock and includes both asset chart steps', async () => {
  const tradingIndex = SITE_TOUR_STEPS.findIndex(step => step.path === '/trading' && step.target === 'page');
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: [`/trading?code=005930&tour=${tradingIndex}`] }, h(AuthContext.Provider, { value: {} }, h(Tour)), h(Location))));
    await click('다음');
    assert.equal(document.querySelector('output').textContent, `/trading?tour=${tradingIndex + 1}&code=005930`);
    assert.equal(document.querySelector('.site-tour-note').getAttribute('aria-label'), 'AI 뉴스 안내');
    await click('뒤로가기');
    assert(document.querySelector('output').textContent.includes('code=005930'));
    assert.deepEqual(SITE_TOUR_STEPS.filter(step => step.path === '/assets').map(step => step.target), ['page', 'asset-charts', 'navigation']);
  } finally { await React.act(async () => root.unmount()); }
});

test('home tour highlights each actual section using the existing pointer and callout template', async () => {
  const fixture = document.createElement('main');
  fixture.id = 'main';
  fixture.innerHTML = '<nav aria-label="주 메뉴"><a href="/dashboard">홈</a></nav>' + ['market', 'ranking-amount', 'ranking-change', 'ranking-volume', 'news', 'favorites'].map(id => `<section data-site-tour="${id}">내용</section>`).join('');
  document.body.prepend(fixture);
  const targets = [...fixture.children];
  targets.splice(1, 0, fixture.querySelector('a[href="/dashboard"]'));
  targets.forEach(element => { element.getBoundingClientRect = () => ({ left: 30, right: 430, top: 180, bottom: 400, width: 400, height: 220 }); });
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/dashboard?tour=0'] }, h(AuthContext.Provider, { value: {} }, h(Tour)), h(Location))));
    for (let i = 0; i < targets.length; i++) {
      assert.equal(document.querySelector('.assets-tour-target'), i === 1 ? null : targets[i]);
      assert(document.querySelector('.assets-tour-note.tutorial-local-note .tutorial-action'));
      assert(!document.querySelector('.tutorial-pointer'));
      assert(!document.querySelector('.site-tour-note .tutorial-skip-button'));
      assert(document.querySelector('.tutorial-skip-button'));
      assert(!document.querySelector('dialog, [aria-modal=true], .site-tour-ring'));
      if (i < targets.length - 1) await click('다음');
    }
    await React.act(async () => document.querySelector('.site-tour-note').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert(!document.querySelector('.assets-tour-target, .site-tour-note'));
  } finally { await React.act(async () => root.unmount()); fixture.remove(); }
});

test('click pointer stays anchored to a narrow button on resize and scroll', async () => {
  const index = SITE_TOUR_STEPS.findIndex(step => step.clickSelector?.includes('/trading'));
  const fixture = document.createElement('nav');
  fixture.setAttribute('aria-label', '주 메뉴');
  fixture.innerHTML = '<a href="/trading">트레이딩</a>';
  document.body.prepend(fixture);
  const target = fixture.firstChild;
  let rect = { left: 300, right: 340, top: 80, bottom: 120, width: 40, height: 40 };
  target.getBoundingClientRect = () => rect;
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: [`/favorites?tour=${index}`] }, h(AuthContext.Provider, { value: {} }, h(Tour)))));
    const overlay = document.querySelector('.site-tour-pointer');
    const cursor = overlay.querySelector('.tutorial-pointer');
    cursor.getBoundingClientRect = () => ({ width: 110, height: 24 });
    window.dispatchEvent(new dom.window.Event('resize'));
    assert.equal(parseFloat(overlay.style.left) + parseFloat(cursor.style.left) + 3, 320, 'SVG tip points to button center');
    assert.equal(parseFloat(overlay.style.top) + parseFloat(cursor.style.top) + 3, 115, 'tip stays inside the button');
    rect = { ...rect, left: window.innerWidth - 60, right: window.innerWidth - 20 };
    window.dispatchEvent(new dom.window.Event('resize'));
    assert(cursor.classList.contains('site-tour-pointer-flipped'));
    assert.equal(parseFloat(overlay.style.left) + parseFloat(cursor.style.left) + 107, rect.left + 20, 'flipped tip keeps the same anchor');
    assert(parseFloat(overlay.style.left) + parseFloat(cursor.style.left) >= 0);
    rect = { ...rect, top: 180, bottom: 220 };
    window.dispatchEvent(new dom.window.Event('scroll'));
    assert.equal(parseFloat(overlay.style.top) + parseFloat(cursor.style.top) + 3, 215, 'pointer follows scrolling');
  } finally { await React.act(async () => root.unmount()); fixture.remove(); }
});

test('menu descriptions appear below their menu button without outlining the page', async () => {
  const fixture = document.createElement('div');
  fixture.innerHTML = '<nav aria-label="주 메뉴"><a href="/favorites">즐겨찾기</a></nav><main id="main">Page content</main>';
  document.body.prepend(fixture);
  const menu = fixture.querySelector('a');
  menu.getBoundingClientRect = () => ({ left: 400, right: 460, top: 80, bottom: 120, width: 60, height: 40 });
  const index = SITE_TOUR_STEPS.findIndex(step => step.path === '/favorites' && step.target === 'page');
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: [`/favorites?tour=${index}`] }, h(AuthContext.Provider, { value: {} }, h(Tour)))));
    const note = document.querySelector('.site-tour-note');
    note.getBoundingClientRect = () => ({ width: 300, height: 160 });
    window.dispatchEvent(new dom.window.Event('resize'));
    assert.equal(note.style.top, '132px');
    assert.equal(note.style.left, '280px');
    assert.equal(document.querySelector('.assets-tour-target'), null);
    assert.equal(document.querySelector('.tutorial-pointer'), null);
  } finally { await React.act(async () => root.unmount()); fixture.remove(); }
});

function flow(entry) {
  return h(MemoryRouter, { initialEntries: [entry] }, h(AuthProvider, null,
    h(Gate, null, h(Routes, null,
      h(Route, { path: '/signup', element: h(Signup) }),
      h(Route, { path: '/survey', element: h(Survey) }),
      h(Route, { path: '/seed-money', element: h(SeedMoney) }),
      h(Route, { path: '*', element: h(Tour) }))), h(Location)));
}

function mockFlowApi(userId) {
  client.default.defaults.adapter = async config => {
    const responses = {
      '/users/check-login-id': { login_id: 'newuser', available: true },
      '/users/me/favorites': { revision: 0, codes: [], groups: [] },
      '/users/register': { user_id: userId },
      '/users/login': { access_token: `flow-${userId}` },
      '/users/me': { user_id: userId, user_name: 'Tester' },
      '/trading/accounts': [{ account_id: 7, balance: '10000000', withdrawable_cash: '10000000' }],
      '/ai/survey': config.method === 'post' ? { investment_style: '안정형', analysis: { summary: '분석', advice: '학습' } } : [],
    };
    assert(config.url in responses, `Unexpected API: ${config.url}`);
    return { data: responses[config.url], status: 200, statusText: 'OK', headers: {}, config };
  };
}

test('signup → survey result → seed → tour and completion survives reload', async () => {
  localStorage.clear();
  client.clearToken();
  mockFlowApi(101);
  let root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(flow('/signup')));
    const values = ['newuser', 'secret', 'secret', 'Tester', 'tester@example.com'];
    await React.act(async () => [...document.querySelectorAll('input')].forEach((input, index) => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, values[index]);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    }));
    await click('중복확인');
    await click('가입하고 시작하기');
    assert(document.querySelector('output').textContent.startsWith('/survey'));
    assert.equal(onboarding.getOnboarding(101), 'survey');
    await React.act(async () => [...document.querySelectorAll('fieldset')].forEach(field => field.querySelector('input').click()));
    await click('저장하고 결과 보기');
    await click('다음');
    assert.equal(document.querySelector('output').textContent, '/seed-money');
    assert(document.body.textContent.includes('얼마로 투자를 시작할까요?'));
    await React.act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await React.act(async () => root.render(flow('/dashboard')));
    assert.equal(document.querySelector('output').textContent, '/seed-money', 'unfinished seed resumes');
    await click('설정하기');
    assert(document.querySelector('.site-tour-intro').open);
    assert(document.body.textContent.includes('주린이들을 위한 프로젝트입니다!'));
    await click('시작하기');
    assert(document.querySelector('.site-tour-note'));
    assert(!document.querySelector('dialog, [aria-modal=true]'));
    const currentNote = document.querySelector('.site-tour-note');
    const currentNext = currentNote.querySelector('.tutorial-action');
    currentNext.focus();
    await click('다음');
    assert.equal(document.querySelector('.site-tour-note'), currentNote, 'step changes preserve the mounted tour');
    assert.equal(document.querySelector('.tutorial-action'), currentNext, 'next button is updated in place');
    assert.equal(onboarding.getOnboarding(101), 'tour:1');
    await React.act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await React.act(async () => root.render(flow('/dashboard')));
    assert.equal(document.querySelector('output').textContent, '/dashboard?tour=1', 'tour resumes at saved step');
    await click('건너뛰기');
    assert.equal(onboarding.getOnboarding(101), 'done');
    assert(!document.querySelector('.site-tour-note'));
  } finally { await React.act(async () => root.unmount()); }
});

test('survey without onboarding query still opens seed; explicit edit returns home', async () => {
  for (const [entry, id, expected] of [['/survey', 102, '/seed-money'], ['/survey?mode=edit', 103, '/dashboard']]) {
    localStorage.clear();
    client.setToken(`flow-${id}`);
    mockFlowApi(id);
    const root = createRoot(document.getElementById('root'));
    try {
      await React.act(async () => root.render(flow(entry)));
      await click('나중에 할게요');
      assert.equal(document.querySelector('output').textContent, expected);
    } finally { await React.act(async () => root.unmount()); }
  }
});

test('default seed reuses an existing cash account without creating another', async () => {
  const root = createRoot(document.getElementById('root'));
  let selected;
  let calls = 0;
  client.default.defaults.adapter = async () => { calls++; throw new Error('Unexpected mutation'); };
  const auth = { isAuthenticated: true, accounts: [{ account_id: 7, balance: '10000000', withdrawable_cash: '10000000' }],
    refresh: async () => {}, selectAccount: id => { selected = id; } };
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/seed-money'] }, h(AuthContext.Provider, { value: auth }, h(SeedMoney)), h(Location))));
    await click('설정하기');
    assert.equal(calls, 0);
    assert.equal(selected, 7);
    assert.equal(document.querySelector('output').textContent, '/dashboard?tour=start');
  } finally { await React.act(async () => root.unmount()); }
});

test('welcome can be skipped without starting the tour or reopening after reload', async () => {
  localStorage.clear();
  client.setToken('flow-104');
  mockFlowApi(104);
  onboarding.setOnboarding(104, 'tour:start');
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(flow('/dashboard')));
    assert(document.querySelector('.site-tour-intro').open);
    assert(!document.querySelector('.site-tour-note'));
    await click('건너뛰기');
    assert.equal(document.querySelector('output').textContent, '/dashboard');
    assert.equal(onboarding.getOnboarding(104), 'done');
    assert(!document.querySelector('dialog, .site-tour-note, .tutorial-skip-button'));
  } finally { await React.act(async () => root.unmount()); }
});

test('failed account refresh retries without creating a duplicate account', async () => {
  const root = createRoot(document.getElementById('root'));
  let calls = 0;
  client.default.defaults.adapter = async config => {
    calls++;
    assert.equal(config.url, '/trading/accounts');
    assert.equal(JSON.parse(config.data).initial_balance, 11000000);
    return { data: { account_id: 8 }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const auth = { isAuthenticated: true, accounts: [], refresh: async () => { throw new Error('Refresh unavailable'); }, selectAccount: () => {} };
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/seed-money'] }, h(AuthContext.Provider, { value: auth }, h(SeedMoney)), h(Location))));
    await click('+1,000,000원');
    await click('설정하기');
    await click('설정하기');
    assert.equal(calls, 1);
    assert.equal(document.querySelector('output').textContent, '/seed-money');
  } finally { await React.act(async () => root.unmount()); }
});

test('survey account setup reuses the initial default but adds a separate account for returning users', async () => {
  for (const initial of [true, false]) {
    const id = initial ? 201 : 202;
    localStorage.clear();
    client.setToken(`flow-${id}`);
    onboarding.setOnboarding(id, initial ? 'survey' : 'done');
    mockFlowApi(id);
    const originalAdapter = client.default.defaults.adapter;
    let created = 0;
    client.default.defaults.adapter = async config => {
      if (config.url === '/trading/accounts' && config.method === 'post') {
        created++;
        assert.equal(JSON.parse(config.data).initial_balance, 10000000);
        return { data: { account_id: 8 }, status: 200, headers: {}, config };
      }
      const response = await originalAdapter(config);
      if (config.url === '/trading/accounts' && created) response.data = [...response.data, { account_id: 8, balance: '10000000', withdrawable_cash: '10000000' }];
      return response;
    };
    const root = createRoot(document.getElementById('root'));
    try {
      await React.act(async () => root.render(flow(initial ? '/survey' : '/survey?mode=edit')));
      await React.act(async () => [...document.querySelectorAll('fieldset')].forEach(field => field.querySelector('input').click()));
      await click('저장하고 결과 보기');
      await click('계좌 설정');
      assert.equal(document.querySelector('output').textContent, initial ? '/seed-money' : '/seed-money?mode=new');
      await click('설정하기');
      assert.equal(created, initial ? 0 : 1);
      assert.equal(document.querySelector('output').textContent, initial ? '/dashboard?tour=start' : '/dashboard');
      assert.equal(localStorage.getItem('gp_account_id'), initial ? '7' : '8');
    } finally { await React.act(async () => root.unmount()); }
  }
});

test('cancelling seed setup returns home without creating an account or being redirected back', async () => {
  for (const initial of [true, false]) {
    const id = initial ? 203 : 204;
    localStorage.clear();
    client.setToken(`flow-${id}`);
    onboarding.setOnboarding(id, initial ? 'seed' : 'done');
    mockFlowApi(id);
    const originalAdapter = client.default.defaults.adapter;
    client.default.defaults.adapter = config => {
      assert.notEqual(config.method, 'post');
      return originalAdapter(config);
    };
    const root = createRoot(document.getElementById('root'));
    try {
      await React.act(async () => root.render(flow(initial ? '/seed-money' : '/seed-money?mode=new')));
      await click('취소');
      assert.equal(document.querySelector('output').textContent, '/dashboard');
      assert.equal(onboarding.getOnboarding(id), 'done');
      assert.equal(document.querySelector('.site-tour-intro'), null);
    } finally { await React.act(async () => root.unmount()); }
  }
});
