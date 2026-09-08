import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

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

test('survey answers and style use the existing two API contracts', async () => {
  const auth = await server.ssrLoadModule('/src/api/auth.js');
  const requests = [];
  client.default.defaults.adapter = async (config) => { requests.push({ url: config.url, method: config.method, body: JSON.parse(config.data) }); return { data: { message: 'ok' }, status: 200, headers: {}, config }; };
  await data.saveSurvey([{ question_number: 1, selected_answer: '테스트 답변' }]);
  await auth.updateInvestmentStyle('안정형');
  assert.deepEqual(requests, [
    { url: '/ai/survey', method: 'post', body: { answers: [{ question_number: 1, selected_answer: '테스트 답변' }] } },
    { url: '/users/survey', method: 'put', body: { investment_style: '안정형' } },
  ]);
});

test('guest routes render login states without mock prices or posts', async () => {
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
