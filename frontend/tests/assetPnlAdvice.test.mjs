import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { act } = React;
const { createRoot: reactCreateRoot } = await import('react-dom/client');
const createRoot = container => { const root = reactCreateRoot(container); return { unmount: () => root.unmount(), render: tree => root.render(React.createElement(AuthContext.Provider, { value: { user: { user_id: 1 }, isAuthenticated: true } }, tree)) }; };
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', envFile: false });
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
after(async () => { await server.close(); dom.window.close(); });
const { default: Advice } = await server.ssrLoadModule('/src/components/ai/AssetPnlAdvice.jsx');
const { fetchAssetCoach } = await server.ssrLoadModule('/src/api/data.js');
const client = await server.ssrLoadModule('/src/api/client.js');

const COACH = { status: 'ok', tone: 'loss', as_of: '2026-11-10T15:00:00+09:00', cached: false,
  headline: '약 261만 원을 서둘러 만회하기보다, 한 종목에 몰린 비중부터 살펴봐요.', intro: '손실이 큰 편이에요. 아래를 확인해 보세요.',
  checkpoints: [{ title: '남은 현금 약 64만 원은 일단 그대로 둬요', body: '처음 산 이유를 돌아보세요.', detail: null },
    { title: '가상전자를 먼저 점검해요', body: '가상전자 비중이 62.5%예요.', detail: '계좌 전체의 주식 비중과 현금 비중을 검토해 보세요.' },
    { title: '감당할 수 있는 손실을 금액으로 정해요', body: '평가금액 약 939만 원이 10% 더 내리면 약 94만 원이 줄어요.', detail: '하락을 예측하는 말이 아니라 예시예요.' }],
  takeaway: '모의투자인 지금은 기준을 세우는 연습에 집중해 보세요.',
  emphasis: ['가상전자 비중이 62.5%', '10% 더 내리면 약 94만 원', '기준을 세우는 연습'],
  disclaimer: '모의투자 연습용 설명이며 투자 권유가 아닙니다.' };
// 덧붙임·한 줄 정리·굵게 표시가 없는 이전 형식의 서버 응답.
const PLAIN = { ...COACH, headline: '평가손실이 약 261만 원이에요.', takeaway: undefined, emphasis: undefined,
  checkpoints: COACH.checkpoints.map(({ title, body }) => ({ title, body })) };
const ok = (config, data, status = 200) => ({ config, data, status, statusText: 'OK', headers: {} });
let calls;
let reply;
function serve(next) {
  calls = [];
  reply = next;
  client.clearRequestCache?.();
  client.default.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, body: config.data && JSON.parse(config.data) });
    return reply(config, calls.length);
  };
}
let root;
async function render(props) {
  root ??= createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Advice, { amount: -2613484, id: 'coach', accountId: 7, ...props })));
}
const banner = () => document.querySelector('.asset-pnl-advice-banner');
const body = () => document.querySelector('.asset-pnl-advice-body');
async function click(element) { await act(async () => element.click()); }
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
});

test('the account is analysed only when the banner is first opened, then reused', async () => {
  serve(config => ok(config, COACH));
  await render();
  assert.equal(calls.length, 0);
  assert.match(banner().textContent, /2,613,484원의 손실/);
  await click(banner());
  assert.deepEqual(calls, [{ url: '/ai/asset-coach', method: 'post', body: { account_id: 7 } }]);
  // 제목은 쉼표 뒤에서 두 줄로 나뉜다.
  assert.equal(body().querySelector('h3').innerHTML, '약 261만 원을 서둘러 만회하기보다,<br>한 종목에 몰린 비중부터 살펴봐요.');
  assert.deepEqual([...body().querySelectorAll('li h4')].map(item => item.textContent), COACH.checkpoints.map(item => item.title));
  // 항목마다 본문과 덧붙임 문단이 나오고, 서버가 알려 준 구절만 굵게 보인다.
  assert.deepEqual([...body().querySelectorAll('li')].map(item => item.querySelectorAll('p').length), [1, 2, 2]);
  assert.equal(body().querySelectorAll('li')[2].textContent, COACH.checkpoints[2].title + COACH.checkpoints[2].body + COACH.checkpoints[2].detail);
  assert.deepEqual([...body().querySelectorAll('li strong, .asset-pnl-advice-takeaway strong')].map(item => item.textContent), COACH.emphasis);
  assert.equal(body().querySelector('.asset-pnl-advice-takeaway').textContent, COACH.takeaway);
  assert.match(body().textContent, /11\.10\(화\) 15:00 기준 · 내 계좌 분석/);
  assert.match(body().textContent, /투자 권유가 아닙니다/);
  assert.doesNotMatch(body().textContent, /목업|예시 계좌|토마토/);
  await click(document.querySelector('.asset-pnl-advice-close'));
  await click(banner());
  assert.equal(calls.length, 1);
});

test('a loading state is shown while the advice is being written', async () => {
  let finish;
  serve(config => new Promise(resolve => { finish = () => resolve(ok(config, COACH)); }));
  await render();
  await click(banner());
  assert.ok(body().querySelector('.asset-pnl-advice-loading[role="status"]'));
  assert.match(body().textContent, /분석 중/);
  assert.equal(body().getAttribute('aria-busy'), 'true');
  await act(async () => finish());
  assert.equal(body().querySelector('h3').textContent, COACH.headline.replace(', ', ','));
});

test('an answer without the newer fields, or with odd ones, still shows plain text', async () => {
  serve(config => ok(config, PLAIN));
  await render();
  await click(banner());
  assert.equal(body().querySelector('h3').innerHTML, PLAIN.headline);
  assert.equal(body().querySelectorAll('li p').length, 3);
  assert.equal(body().querySelector('.asset-pnl-advice-takeaway'), null);
  assert.equal(body().querySelector('strong'), null);
  await act(async () => root.unmount());
  root = null;
  // 굵게 표시 구절은 글자 그대로만 쓰고, 꾸밈 기호나 태그는 해석하지 않는다.
  serve(config => ok(config, { ...COACH, takeaway: 7, emphasis: ['<b>가상전자</b>', 42, '처음 산 이유'],
    checkpoints: COACH.checkpoints.map((item, index) => index ? { ...item, detail: ['x'] } : { ...item, body: '**처음 산 이유**를 <i>돌아보세요</i>.' }) }));
  await render();
  await click(banner());
  const first = body().querySelector('li');
  assert.equal(first.querySelector('p').textContent, '**처음 산 이유**를 <i>돌아보세요</i>.');
  assert.equal(first.querySelector('i'), null);
  assert.deepEqual([...body().querySelectorAll('strong')].map(item => item.textContent), ['처음 산 이유']);
  assert.equal(body().querySelectorAll('li p').length, 3);
  assert.equal(body().querySelector('.asset-pnl-advice-takeaway'), null);
});

test('failures and malformed answers fall back to general checks with a retry', async () => {
  serve((config, count) => count === 1 ? Promise.reject(Object.assign(new Error('bad gateway'), { config, response: { status: 502 } }))
    : count === 2 ? ok(config, { ...COACH, checkpoints: COACH.checkpoints.slice(0, 2) }) : ok(config, COACH));
  await render();
  await click(banner());
  assert.match(body().textContent, /기본 안내/);
  assert.match(body().textContent, /AI 조언을 불러오지 못해 일반적인 점검 항목을 보여 드립니다/);
  assert.equal(body().querySelectorAll('li').length, 3);
  await click(body().querySelector('.asset-pnl-advice-retry'));
  assert.match(body().textContent, /AI 조언을 불러오지 못해/);
  await click(body().querySelector('.asset-pnl-advice-retry'));
  assert.equal(body().querySelector('h3').textContent, COACH.headline.replace(', ', ','));
  assert.equal(calls.length, 3);
});

test('practice screens and empty accounts never ask for AI advice', async () => {
  serve(config => ok(config, { status: 'no_holdings' }));
  await render({ practice: true });
  await click(banner());
  assert.equal(calls.length, 0);
  assert.match(body().textContent, /기본 안내/);
  await act(async () => root.unmount());
  root = null;
  await render({ amount: 120000 });
  await click(banner());
  assert.equal(calls.length, 1);
  assert.match(body().textContent, /수익이 났을 때가 투자 원칙을 점검할 기회입니다/);
  assert.doesNotMatch(body().textContent, /불러오지 못해/);
});

test('fetchAssetCoach checks the answer shape', async () => {
  serve(config => ok(config, { ...COACH, as_of: 'not a date' }));
  await assert.rejects(fetchAssetCoach(7));
  serve(config => ok(config, { status: 'no_holdings' }));
  assert.deepEqual(await fetchAssetCoach(7), { status: 'no_holdings' });
  serve(config => ok(config, PLAIN));
  const plain = await fetchAssetCoach(7);
  assert.deepEqual([plain.takeaway, plain.emphasis, plain.checkpoints.map(item => item.detail)], [null, [], [null, null, null]]);
  serve(config => ok(config, { ...COACH, emphasis: ['가', '나', '다', '라', '마', ''] }));
  assert.deepEqual((await fetchAssetCoach(7)).emphasis, ['가', '나', '다', '라']);
});
