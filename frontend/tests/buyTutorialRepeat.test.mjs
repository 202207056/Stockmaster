import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
const observedResize = new Set();
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  MutationObserver: dom.window.MutationObserver, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class { constructor(callback) { this.callback = callback; observedResize.add(this); } observe() {} disconnect() { observedResize.delete(this); } } });
dom.window.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom',
  define: { 'import.meta.env.VITE_ENABLE_ORDER_SUBMISSION': '"true"' } });
after(async () => { await server.close(); dom.window.close(); });
const { default: Tutorial } = await server.ssrLoadModule('/src/pages/BuyTutorial.jsx');
const { default: SitePractice } = await server.ssrLoadModule('/src/components/learn/SitePractice.jsx');
const { default: Trading } = await server.ssrLoadModule('/src/pages/Trading.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const types = await server.ssrLoadModule('/src/utils/orderTypes.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const button = label => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label);
const click = async label => { assert(button(label), label); await React.act(async () => button(label).click()); };
const select = async (label, value) => React.act(async () => {
  const el = container.querySelector(`select[aria-label="${label}"]`);
  assert(el, label); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true }));
});


test('QA purchase tutorial reopens despite completion and dismissal; help stays independent', async () => {
  localStorage.clear();
  localStorage.setItem(types.buyTutorialKey(42), 'true');
  let writes = 0;
  client.default.defaults.adapter = async config => {
    if (config.method !== 'get') writes++;
    return { data: [], status:200, headers:{}, config };
  };
  const account = {account_id:7, account_name:'계좌', withdrawable_cash:1000000};
  const root = createRoot(container);
  try {
    await React.act(async()=>root.render(React.createElement(MemoryRouter, {initialEntries:['/trading']},
      React.createElement(AuthContext.Provider, {value:{isAuthenticated:true,user:{user_id:42},accountId:7,account,accounts:[account],refresh:async()=>{}}}, React.createElement(Trading)))));
    await React.act(async()=>container.querySelector('[aria-label="주문유형 설명"]').click());
    assert(container.querySelector('.order-type-help-bubble'));
    assert(!container.querySelector('.buy-tutorial-inline'));
    await React.act(async()=>container.querySelector('.order-type-help-dismiss').click());
    for (let i=0;i<2;i++) {
      await React.act(async()=>container.querySelector('[data-side="매수"]').click());
      assert(container.querySelector('.buy-tutorial-inline'));
      assert(container.querySelector('.buy-tutorial-note').textContent.includes('계좌 선택'));
      await React.act(async()=>container.querySelector('[aria-label="연습 종료"]').click());
      assert(!container.querySelector('.buy-tutorial-inline'));
    }
    assert.equal(writes,0);
  } finally { await React.act(async()=>root.unmount()); }
});

test('settings switch persists OFF and allows purchase controls without automatic tutorial', async () => {
 const {default:MyPage}=await server.ssrLoadModule('/src/pages/MyPage.jsx');
 const {default:Workspace}=await server.ssrLoadModule('/src/components/common/ChartWorkspace.jsx');
 const {CHART_EXAMPLE}=await server.ssrLoadModule('/src/utils/chartTypes.js');
 const root=createRoot(container);
 const account={account_id:7,account_name:'계좌',withdrawable_cash:1000000};
 const wrap=child=>React.createElement(MemoryRouter,{},React.createElement(AuthContext.Provider,{value:{isAuthenticated:true,user:{user_id:42},accountId:7,account,accounts:[account],refresh:async()=>{}}},child));
 try {
  await React.act(async()=>root.render(wrap(React.createElement(MyPage))));
  await React.act(async()=>container.querySelector('[aria-labelledby="tutorial-setting-label"]').click());
  assert.equal(localStorage.getItem('stockmaster:tutorials-enabled'),'false');
  await React.act(async()=>root.render(wrap(React.createElement(Trading))));
  await React.act(async()=>container.querySelector('[data-side="매수"]').click());
  assert(!container.querySelector('.buy-tutorial-inline'));
  await React.act(async()=>container.querySelector('[aria-label="주문유형 설명"]').click());
  assert(container.querySelector('.order-type-help-bubble'));
  await React.act(async()=>root.render(wrap(React.createElement(Workspace,{rows:CHART_EXAMPLE}))));
  await select('그래프 종류','candle');
  assert(!container.querySelector('.chart-tour-note'));
  assert.equal(container.querySelector('[data-chart-selector]').value,'candle');
 } finally {
  await React.act(async()=>root.unmount());
  localStorage.removeItem('stockmaster:tutorials-enabled');
  window.dispatchEvent(new dom.window.StorageEvent('storage',{key:'stockmaster:tutorials-enabled'}));
 }
});
