import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: useNewsAnalysis } = await server.ssrLoadModule('/src/hooks/useNewsAnalysis.js');
const { default: Badge } = await server.ssrLoadModule('/src/components/common/NewsAnalysisBadge.jsx');
const { default: MoodCard } = await server.ssrLoadModule('/src/components/dashboard/MarketMoodCard.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const articles = Array.from({length:13},()=>({title:'실적 발표',summary:'매출 증가',date:'6분전'}));
function View() {
  const resource = useNewsAnalysis(articles);
  return React.createElement('div', null, articles[0].title,
    resource.error ? '분석 실패' : null,
    React.createElement(Badge, { analysis: resource.data?.[0] }), React.createElement(MoodCard,{news:articles,resource,authenticated:!!resource.data}));
}

test('analysis requires login, sends auth, renders badges and keeps news after failure/logout', async () => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  let calls = 0;
  let fail = false;
  client.default.defaults.adapter = async config => {
    calls++;
    assert.equal(config.url, '/ai/news-analysis');
    assert.equal(config.headers.Authorization, 'Bearer test');
    const payload = JSON.parse(config.data);
    assert.equal(payload.articles.length,10);
    assert.equal(payload.articles[0].content, '매출 증가');
    assert(!('published_at' in payload.articles[0]));
    if (fail) throw Object.assign(new Error('offline'), { response: { status: 503 }, config });
    return { data: { articles: payload.articles.map(a=>({article_id:a.article_id,sentiment:{label:'POSITIVE'},importance:{label:'HIGH'}})) }, status: 200, headers: {}, config };
  };
  const render = async loggedIn => React.act(async () => {
    root.render(React.createElement(AuthContext.Provider, { value: { user: loggedIn ? { user_id: 1 } : null, isAuthenticated: loggedIn } }, React.createElement(View)));
  });
  try {
    await render(false);
    assert.equal(calls, 0);
    client.setToken('test');
    await render(true);
    assert.match(container.textContent, /AI 호재/);
    assert.match(container.textContent, /중요도 높음/);
    assert.match(container.textContent,/AI 뉴스 분석 10건 기준/);assert.equal(calls,1);
    await render(false);
    assert.doesNotMatch(container.textContent, /AI 호재/);
    fail = true;
    await render(true);
    assert.match(container.textContent, /실적 발표/);
    assert.match(container.textContent, /분석 실패/);
    assert.doesNotMatch(container.textContent, /AI 호재/);
  } finally { await React.act(async () => root.unmount()); }
});
