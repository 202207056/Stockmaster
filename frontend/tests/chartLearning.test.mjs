import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { heikinAshi, renkoBricks, simpleMovingAverage, CHART_EXAMPLE, CHART_TYPES } from '../src/utils/chartTypes.js';

const dom = new JSDOM('<div id="root"></div><button id="outside">outside</button>', { url: 'http://localhost/' });
const observers = new Set();
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class { constructor(fn) { this.fn = fn; observers.add(this); } observe() {} disconnect() { observers.delete(this); } } });
window.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { renderToString } = await import('react-dom/server');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: Workspace } = await server.ssrLoadModule('/src/components/common/ChartWorkspace.jsx');
const { default: Chart } = await server.ssrLoadModule('/src/components/common/CandleChart.jsx');
const { default: Course } = await server.ssrLoadModule('/src/pages/ChartLearning.jsx');
const client = await server.ssrLoadModule('/src/api/client.js');
const container = document.getElementById('root');
const select = async (label, value) => React.act(async () => {
  const node = container.querySelector(`select[aria-label="${label}"]`); assert(node); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true }));
});

test('synthetic formulas, two-box Renko reversal, bounded rendering, and SMA warmup', () => {
  const rows = [{ open:100,high:120,low:90,close:110 },{ open:111,high:140,low:100,close:130 }];
  const original = structuredClone(rows), ha = heikinAshi(rows);
  assert.deepEqual(ha[0], { open:105,high:120,low:90,close:105 });
  assert.equal(ha[1].open,105); assert.equal(ha[1].close,120.25);
  assert.deepEqual(rows,original);
  const make = prices => prices.map(close => ({close}));
  assert.deepEqual(renkoBricks(make([100,120,110]),10).rows.map(r=>[r.open,r.close]),[[100,110],[110,120]]);
  assert.deepEqual(renkoBricks(make([100,120,100]),10).rows.map(r=>[r.open,r.close]),[[100,110],[110,120],[110,100]]);
  assert.equal(renkoBricks(make([100,100000]),1).rows.length,2000);
  assert.equal(renkoBricks(make([100,100000]),1).truncated,true);
  assert.equal(renkoBricks(make([100,110]),0).rows.length,0);
  assert.deepEqual(simpleMovingAverage(make([10,20,30,40]),3),[null,null,20,30]);
});

test('all seven charts render finite geometry, raw price tables, and synthetic disclosures', () => {
  for (const { id } of CHART_TYPES) {
    const html = renderToString(React.createElement(Chart,{ rows:CHART_EXAMPLE,type:id,scale:'log',showVolume:true,maPeriod:5 }));
    assert(!html.includes('NaN')); assert(!html.includes('Infinity')); assert(html.includes('<svg'));
    assert(html.includes('시가·고가·저가·종가'));
    if (['heikin','renko'].includes(id)) { assert(html.includes('원자료')); assert(!html.includes('시간별 거래량')); }
  }
  const flat = renderToString(React.createElement(Chart,{ rows:[{date:'a',open:100,high:100,low:100,close:100}],type:'candle' }));
  assert(!flat.includes('NaN'));
});

test('first interaction stays in-place, follows resizing, advances on selection then opens concepts without API calls', async () => {
  localStorage.clear(); let calls = 0;
  client.default.defaults.adapter = async () => { calls++; throw new Error('No account API'); };
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter,{},React.createElement(Routes,{},
      React.createElement(Route,{path:'/',element:React.createElement(Workspace,{rows:CHART_EXAMPLE,userId:'chart-test-a'})}),
      React.createElement(Route,{path:'/learn/charts',element:React.createElement('h1',{},'Concept destination')})
    ))));
    assert(!container.querySelector('[role=dialog]'));
    await select('그래프 종류','candle');
    assert(container.querySelector('[role=dialog]')); assert(container.querySelector('.chart-tour-note').textContent.includes('1 / 7'));
    assert.equal(document.getElementById('outside').inert,true);
    const target = container.querySelector('[data-chart-selector]');
    target.getBoundingClientRect = () => ({left:200,top:500,bottom:540,width:150,height:40});
    for (const observer of observers) observer.fn();
    const before = container.querySelector('.chart-tour-note').style.top;
    target.getBoundingClientRect = () => ({left:100,top:350,bottom:390,width:150,height:40});
    for (const observer of observers) observer.fn();
    assert.notEqual(container.querySelector('.chart-tour-note').style.top,before);
    for (const {id} of CHART_TYPES.slice(1)) {
      await select('그래프 종류',id);
      if (id === 'candle') {
        assert(!container.querySelector('dialog'));
        while (container.querySelector('[data-candle-target]')) await React.act(async()=>container.querySelector('.chart-illustrated-plot').click());
      }
    }
    assert(container.querySelector('.chart-tour-note').textContent.includes('7 / 7'));
    await React.act(async () => [...container.querySelectorAll('button')].find(n=>n.textContent==='상세 차트 학습 시작').click());
    assert(container.textContent.includes('Concept destination'));
    assert.notEqual(document.getElementById('outside').inert,true);
    assert([...Array(localStorage.length)].some((_,i)=>localStorage.key(i).includes('chart-tutorial:v1')));
    assert.equal(calls,0);
  } finally { await React.act(async()=>root.unmount()); }
});

test('chart guide shows comparisons together without quizzes, steps, or progress storage', async () => {
  localStorage.clear(); const root = createRoot(container);
  try {
    await React.act(async()=>root.render(React.createElement(MemoryRouter,{},React.createElement(Course))));
    assert.equal(container.querySelectorAll('.chart-type-card').length,7);
    assert.equal(container.querySelectorAll('.chart-candle-shapes figure').length,5);
    assert.equal(container.querySelectorAll('.chart-guide-reference details').length,14);
    assert.equal(container.querySelectorAll('.chart-sources a').length,31);
    assert(container.textContent.includes('전일 대비 −2%'));
    assert(container.textContent.includes('같은 시작, 다시 내려온 예시'));
    assert.equal(container.querySelectorAll('input, .chart-check, .chart-course-layout').length,0);
    assert.equal(localStorage.length,0);
    for (const img of container.querySelectorAll('svg')) {
      assert(img.getAttribute('aria-label'));
      assert(!img.outerHTML.includes('NaN'));
    }
  } finally { await React.act(async()=>root.unmount()); }
});

test('completed introduction stays dismissed, explicit replay restores selection, another user starts fresh', async () => {
  const root = createRoot(container);
  const render = userId => React.createElement(MemoryRouter,{},React.createElement(Workspace,{key:userId,rows:CHART_EXAMPLE,userId,repeatTutorial:false}));
  try {
    await React.act(async()=>root.render(render('chart-test-a')));
    await select('그래프 종류','bar');
    assert(!container.querySelector('[role=dialog]'));
    await React.act(async()=>[...container.querySelectorAll('button')].find(n=>n.textContent==='유형 소개 다시 보기').click());
    assert(container.querySelector('[role=dialog]'));
    await React.act(async()=>container.querySelector('[data-chart-selector]').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    assert(!container.querySelector('[role=dialog]'));
    assert.equal(container.querySelector('[data-chart-selector]').value,'bar');
    await React.act(async()=>root.render(render('chart-test-other')));
    await select('그래프 종류','bar');
    assert(container.querySelector('[role=dialog]'));
    assert.equal(container.querySelector('[data-chart-selector]').value,'line');
  } finally { await React.act(async()=>root.unmount()); }
});

test('temporary QA default reopens after completion and dismissal without restarting active steps', async () => {
  const root = createRoot(container);
  try {
    await React.act(async()=>root.render(React.createElement(MemoryRouter,{},React.createElement(Workspace,{rows:CHART_EXAMPLE,userId:'chart-test-a'}))));
    for (let i = 0; i < 2; i++) {
      await React.act(async()=>container.querySelector('[data-chart-selector]').dispatchEvent(new Event('pointerdown',{bubbles:true,cancelable:true})));
      assert(container.querySelector('.chart-tour-note').textContent.includes('1 / 7'));
      await select('그래프 종류','candle');
      assert(!container.querySelector('dialog'));
      assert(container.querySelector('.chart-tour-note').textContent.includes('2 / 7'));
      await React.act(async()=>container.querySelector('[aria-label="차트 안내 종료"]').click());
      assert(!container.querySelector('[role=dialog]'));
    }
  } finally { await React.act(async()=>root.unmount()); }
});

test('tutorial shares guide copy, annotates example geometry and opens comparisons without leaving the chart', async () => {
  const { CHART_GUIDE_TYPES } = await server.ssrLoadModule('/src/constants/chartGuideContent.js');
  const root = createRoot(container);
  try {
    await React.act(async()=>root.render(React.createElement(MemoryRouter,{},React.createElement(Workspace,{rows:CHART_EXAMPLE,replay:true}))));
    for (const [id,,purpose,description,caution] of CHART_GUIDE_TYPES) {
      if (id!=='line') await select('그래프 종류',id);
      if (id==='candle') {
        assert(!container.querySelector('dialog'));
        const titles = ['네 가격','몸통이 길면','몸통이 짧으면','윗꼬리','아랫꼬리','음봉','시가와 종가','전일보다'];
        for (let i=0;i<titles.length;i++) {
          assert(container.querySelector('.chart-tour-note').textContent.includes(titles[i]));
          assert(container.querySelector('[data-candle-target]'));
          assert(!container.querySelector('.candle-next-target'));
          assert.equal([...container.querySelectorAll('button')].some(button => button.textContent === '전체 구조 크게 보기'), i === titles.length - 1);
          if (i<titles.length-1) await React.act(async()=>container.querySelector(i % 2 ? '.chart-tour-note p' : '.chart-illustrated-plot').click());
        }
        assert(container.querySelector('.chart-tour-note').textContent.includes('2%'));
        await React.act(async()=>[...container.querySelectorAll('button')].find(n=>n.textContent==='전체 구조 크게 보기').click());
      } else {
        const note = container.querySelector('.chart-tour-note').textContent;
        for (const text of [purpose,description,caution]) assert(note.includes(text));
        assert(container.querySelector('.chart-lesson-mark'));
        await React.act(async()=>container.querySelector('.chart-lesson-mark').click());
      }
      assert(container.querySelector('dialog[open]'));
      assert(!container.querySelector('input[type=radio]'));
      await React.act(async()=>container.querySelector('[aria-label="그림 설명 닫기"]').click());
    }
    await React.act(async()=>[...container.querySelectorAll('button')].find(n=>n.textContent==='그래프 모양과 지표 비교').click());
    assert.equal(container.querySelectorAll('dialog .chart-compare-pair').length,4);
    await React.act(async()=>container.querySelector('[aria-label="그림 설명 닫기"]').click());
    await React.act(async()=>[...container.querySelectorAll('button')].find(n=>n.textContent==='튜토리얼 마치기').click());
    assert(!container.querySelector('[role=dialog]'));
    assert(!container.querySelector('.chart-lesson-marks'));
    assert.equal(container.querySelectorAll('tbody tr').length,CHART_EXAMPLE.length,'original prices restored');
  } finally { await React.act(async()=>root.unmount()); }
});
