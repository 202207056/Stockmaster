import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

// Learning UI below is also rendered with local fixtures; no live order submission.

// Local adapter tests: never register users, send orders or publish to the live server.
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
globalThis.window = new EventTarget();
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(async () => { await server.close(); });
const client = await server.ssrLoadModule('/src/api/client.js');
const data = await server.ssrLoadModule('/src/api/data.js');

test('API adapters send auth and query parameters; portfolio quotes degrade independently', async () => {
  client.setToken('local-test-token');
  const requests = [];
  client.default.defaults.adapter = async (config) => {
    requests.push(config);
    let response;
    if (config.url === '/stocks') response = [{ symbol_code: 'TEST', name: '테스트 종목' }];
    else if (config.url === '/trading/portfolio') response = { withdrawable_cash: '500', holdings: [{ symbol_code: 'TEST', hold_quantity: 2, avg_price: 10 }, { symbol_code: 'MISSING', hold_quantity: 1, avg_price: 10 }] };
    else if (config.url === '/stocks/TEST/price') response = { current_price: 11 };
    else throw Object.assign(new Error('upstream unavailable'), { response: { status: 503 }, config, isAxiosError: true });
    return { data: response, status: 200, statusText: 'OK', headers: {}, config };
  };
  const stocks = await data.fetchStocks('TEST');
  assert.equal(stocks[0].name, '테스트 종목');
  assert.equal(requests[0].params.search, 'TEST');
  assert.equal(requests[0].headers.Authorization, 'Bearer local-test-token');
  const portfolio = await data.fetchValuedPortfolio(7);
  assert.equal(requests[1].params.account_id, 7);
  assert.equal(portfolio.holdings[0].quote.current_price, 11);
  assert.equal(portfolio.holdings[1].quote, null);
});

test('late 401 from a previous token cannot clear a new session', async () => {
  client.setToken('old-token');
  client.default.defaults.adapter = async (config) => {
    client.setToken('new-token');
    throw Object.assign(new Error('Unauthorized'), { response: { status: 401 }, config, isAxiosError: true });
  };
  await assert.rejects(data.fetchStocks('TEST'));
  assert.equal(client.getToken(), 'new-token');
});

test('current-session 401 clears the token', async () => {
  client.setToken('current-token');
  client.default.defaults.adapter = async (config) => { throw Object.assign(new Error('Unauthorized'), { response: { status: 401 }, config, isAxiosError: true }); };
  await assert.rejects(data.fetchStocks('TEST'));
  assert.equal(client.getToken(), null);
});

test('survey uses a single save-and-analyze API and preserves the server result', async () => {
  const requests = [];
  const response = { investment_style: '적극투자형', analysis: { summary: '서버 요약', advice: '서버 조언', learning_roadmap: ['분산 투자 연습'] } };
  client.default.defaults.adapter = async (config) => { requests.push({ url: config.url, method: config.method, body: JSON.parse(config.data) }); return { data: response, status: 200, headers: {}, config }; };
  const result = await data.saveSurvey([{ question_number: 1, selected_answer: '테스트 답변' }]);
  assert.deepEqual(result, response);
  assert.deepEqual(requests, [
    { url: '/ai/survey', method: 'post', body: { answers: [{ question_number: 1, selected_answer: '테스트 답변' }] } },
  ]);
  const { SurveyResult } = await server.ssrLoadModule('/src/pages/Survey.jsx');
  const markup = renderToString(React.createElement(SurveyResult, { result }));
  for (const text of ['적극투자형', '서버 요약', '서버 조언', '분산 투자 연습']) assert.ok(markup.includes(text));
  assert.ok(!markup.includes('권장 주식 비중'));
});

test('indices allow guests and coaching sends the selected symbol with authentication', async () => {
  const requests = [];
  client.default.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: config.url === '/market/indices' ? [{ code: 'kospi', value: 2650.12, change_rate: 0.85 }] : { facts: { symbol_code: config.params.symbol }, advice: '연습' }, status: 200, headers: {}, config };
  };
  client.clearToken();
  assert.equal((await data.fetchMarketIndices())[0].value, 2650.12);
  assert.equal(requests[0].headers.Authorization, undefined);
  client.setToken('coach-test-token');
  assert.equal((await data.fetchCoach('000660')).facts.symbol_code, '000660');
  assert.equal(requests[1].url, '/ai/coach');
  assert.equal(requests[1].params.symbol, '000660');
  assert.equal(requests[1].headers.Authorization, 'Bearer coach-test-token');
  client.clearToken();
});

test('market cards display actual values and keep unavailable indices pending', async () => {
  const { MarketCard } = await server.ssrLoadModule('/src/components/dashboard/MarketStrip.jsx');
  const markup = renderToString(React.createElement(MarketCard, { item: { name: '코스피', value: 2650.12, change_rate: -0.42 } }));
  assert.ok(markup.includes('2,650.12'));
  assert.ok(markup.includes('▼ 0.42%'));
  const missing = renderToString(React.createElement(MarketCard, { item: { name: '나스닥', value: null, change_rate: null } }));
  assert.ok(missing.includes('준비 중'));
  assert.ok(!missing.includes('0.00'));
});

test('public data renders even while session verification is pending or failed', async () => {
  const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
  const { default: RemoteState } = await server.ssrLoadModule('/src/components/common/RemoteState.jsx');
  for (const session of [{ isLoading: false }, { isLoading: true }, { sessionError: new Error('session unavailable') }]) {
    const value = { user: null, isAuthenticated: false, ...session };
    const markup = renderToString(React.createElement(AuthContext.Provider, { value },
      React.createElement(RemoteState, { requiresAuth: false, authenticated: false, resource: { loading: false, error: null } }, 'PUBLIC_QUOTE')));
    assert.ok(markup.includes('PUBLIC_QUOTE'));
  }
});

test('guest trading starts public data loading and retains the order login notice', async () => {
  const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
  const { default: Trading } = await server.ssrLoadModule('/src/pages/Trading.jsx');
  const value = { user: null, isAuthenticated: false, isLoading: false, accounts: [], accountId: null };
  const markup = renderToString(React.createElement(AuthContext.Provider, { value },
    React.createElement(MemoryRouter, { initialEntries: ['/trading?code=005930'] }, React.createElement(Trading))));
  assert.equal((markup.match(/불러오는 중이에요/g) || []).length, 3);
  assert.ok(markup.includes('로그인'));
  assert.equal((markup.match(/로그인하면 최신 데이터를/g) || []).length, 1); // Authenticated coaching only.
});

test('guest routes render public or login states without mock prices or posts', async () => {
  const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
  const value = { user: null, isAuthenticated: false, isLoading: false, accounts: [], accountId: null };
  for (const name of ['Dashboard', 'Trading', 'Assets', 'Community', 'Survey', 'Favorites', 'MyPage']) {
    const { default: Page } = await server.ssrLoadModule(`/src/pages/${name}.jsx`);
    const markup = renderToString(React.createElement(AuthContext.Provider, { value }, React.createElement(MemoryRouter, null, React.createElement(Page))));
    assert.ok(markup.length > 100, name);
    assert.ok(!markup.includes('목업'), name);
    if (!['Favorites'].includes(name)) assert.ok(markup.includes('로그인'), name);
  }
});

test('daily candles render an accessible price table', async () => {
  const { default: Chart } = await server.ssrLoadModule('/src/components/common/CandleChart.jsx');
  const markup = renderToString(React.createElement(Chart, { rows: [{ date: '2026-09-08', open: 100, high: 120, low: 90, close: 110 }] }));
  assert.ok(markup.includes('role="img"'));
  assert.ok(markup.includes('일별 가격 표 보기'));
  assert.ok(markup.includes('110원'));
});

test('favorites remain separate for guests and different users', async () => {
  const favorites = await server.ssrLoadModule('/src/utils/favorites.js');
  favorites.setFavoritesOwner(null);
  favorites.addFavorite('GUEST');
  favorites.setFavoritesOwner(1);
  assert.deepEqual(favorites.getFavorites(), []);
  favorites.addFavorite('USER_ONE');
  favorites.setFavoritesOwner(2);
  assert.deepEqual(favorites.getFavorites(), []);
  favorites.setFavoritesOwner(1);
  assert.deepEqual(favorites.getFavorites(), ['USER_ONE']);
  favorites.setFavoritesOwner(null);
  assert.deepEqual(favorites.getFavorites(), ['GUEST']);
});

test('learning home prioritizes short activities and retains the glossary as optional help', async () => {
  const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
  const { default: Learn } = await server.ssrLoadModule('/src/pages/Learn.jsx');
  const render = (url) => renderToString(React.createElement(AuthContext.Provider, { value: { user: null, isAuthenticated: false } }, React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(Learn))));
  const home = render('/learn');
  assert(home.includes('보유 비중 비교하기') && home.includes('문장 속 개념 찾기'));
  assert(home.includes('코스를 먼저 듣지 않아도'));
  assert(!home.includes('용어 카드'));
  assert(render('/learn?tab=glossary').includes('투자 용어사전'));
  assert(render('/learn?tab=courses&lesson=unknown').includes('수업을 찾을 수 없어요'));
});

test('every lesson practice renders and completion stays gated until both questions are attempted', async () => {
  const { default: Courses } = await server.ssrLoadModule('/src/components/learn/CourseLessons.jsx');
  const { LESSONS } = await server.ssrLoadModule('/src/constants/learningContent.js');
  const { getLearningStore } = await server.ssrLoadModule('/src/utils/learningStore.js');
  const scope = 'lesson-render-test'; const store = getLearningStore(scope);
  for (const lesson of LESSONS) {
    store.write(`lesson:${lesson.id}`, { step: 1, completed: false, updatedAt: '' });
    const markup = renderToString(React.createElement(MemoryRouter, null, React.createElement(Courses, { scope, lessonId: lesson.id })));
    assert(markup.includes(lesson.title), lesson.id);
    assert(markup.includes('교육용 가상 데이터'), lesson.id);
  }
  store.write('lesson:A1', { step: 3, completed: false, updatedAt: '' });
  const gated = renderToString(React.createElement(MemoryRouter, null, React.createElement(Courses, { scope, lessonId: 'A1' })));
  assert(gated.includes('확인 문제 2개에 답하면'));
  assert(gated.includes('disabled=""'));
});

test('local notebook displays original and revisions without leaking another account or injecting HTML', async () => {
  const { default: Notebook } = await server.ssrLoadModule('/src/components/learn/DecisionNotebook.jsx');
  const { getLearningStore } = await server.ssrLoadModule('/src/utils/learningStore.js');
  getLearningStore('account-a').write('plan:X', { reason: '<script>secret</script>', evidence: '', uncertainty: '', condition: '', createdAt: '2026-09-15T00:00:00Z', revisions: [{ choice: '계획 수정', reason: '새 정보 확인', createdAt: '2026-09-15T01:00:00Z' }] });
  const a = renderToString(React.createElement(Notebook, { scope: 'account-a', symbol: 'X' }));
  const b = renderToString(React.createElement(Notebook, { scope: 'account-b', symbol: 'X' }));
  assert(a.includes('&lt;script&gt;secret&lt;/script&gt;'));
  assert(a.includes('새 정보 확인'));
  assert(!b.includes('secret'));
  assert(!a.includes('type="submit"'));
});
