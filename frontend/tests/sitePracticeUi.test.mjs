import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { TRADING_TUTORIALS } from '../src/constants/tradingTutorials.js';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.FormData = dom.window.FormData;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route, Outlet } = await import('react-router-dom');
const { act } = React;
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: SitePractice } = await server.ssrLoadModule('/src/components/learn/SitePractice.jsx');
const { default: Trading } = await server.ssrLoadModule('/src/pages/Trading.jsx');
const { default: Assets } = await server.ssrLoadModule('/src/pages/Assets.jsx');
const { default: client } = await server.ssrLoadModule('/src/api/client.js');
let apiCalls = 0;
client.defaults.adapter = async () => { apiCalls++; throw new Error('Practice must never call the API'); };
const container = document.getElementById('root');
const button = label => [...container.querySelectorAll('button')].find(element => element.textContent.trim() === label);
const active = () => container.querySelector('.tutorial-target-active');
async function click(element) { assert(element, 'control exists'); assert(!element.disabled, 'control enabled'); await act(async () => element.click()); }
async function fill(input, value) {
  assert(input);
  await act(async () => {
    const type = input.tagName === 'SELECT' ? dom.window.HTMLSelectElement : dom.window.HTMLInputElement;
    Object.getOwnPropertyDescriptor(type.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new dom.window.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
function tree(course) {
  return React.createElement(MemoryRouter, { initialEntries: [`${course.start || '/trading'}?practice=${course.id}`] }, React.createElement(Routes, null,
    React.createElement(Route, { element: React.createElement(SitePractice, null, React.createElement(Outlet)) },
      React.createElement(Route, { path: '/trading', element: React.createElement(Trading) }),
      React.createElement(Route, { path: '/assets', element: React.createElement(Assets) }))));
}

for (const course of TRADING_TUTORIALS) test(`site tour ${course.id}: existing pages, direct controls, no account API calls`, async () => {
  const root = createRoot(container);
  apiCalls = 0;
  try {
    await act(async () => root.render(tree(course)));
    await click(button('시작하기'));
    for (const step of course.steps) {
      assert(active(), `highlight exists: ${step.title}`);
      assert(container.textContent.includes(step.text), `contextual instruction: ${step.title}`);
      assert(!container.querySelector('input[type="radio"], input[inputmode="decimal"]'));
      assert(!container.textContent.includes('예측 확인'));
      if (step.read) await click(active().querySelector('button.tutorial-action'));
      else switch (step.event) {
        case 'search': await fill(active().querySelector('input'), '예시'); await click(active().querySelector('button')); break;
        case 'stock': await click(active().querySelector('button')); break;
        case 'account': await fill(active().querySelector('select'), 2); break;
        case 'buy-fields':
        case 'sell-fields':
          await fill(active().querySelector('select'), step.event === 'buy-fields' ? '매수' : '매도');
          await fill(active().querySelector('input'), step.event === 'buy-fields' ? (course.id === 'buy' ? 3 : 10) : 5);
          await click(button('입력 확인')); break;
        case 'rules':
          await act(async () => { const details = active().querySelector('details'); details.open = true; details.dispatchEvent(new dom.window.Event('toggle')); }); break;
        case 'prepare': await click(active().querySelector('button')); assert(container.querySelector('dialog[open]')); break;
        case 'filled':
          if (course.id === 'buy') {
            await click(button('취소'));
            assert(!container.querySelector('dialog[open]'));
            await click(active().querySelector('button'));
          }
          await click(active().querySelector('button')); assert(container.textContent.includes('주문 완료!')); break;
        case 'closed': await click(button('확인')); break;
        case 'cancelled': await click(button('취소')); assert(!active().querySelector('table'), 'no order created by preview cancellation'); break;
        case 'history-refresh': await click(button('내역 새로고침')); break;
        case 'assets': await click(active().querySelector('a')); assert(container.querySelector('h1').textContent === '내 자산'); break;
        case 'trading': await click(active().querySelector('a')); assert(container.querySelector('h1').textContent === '트레이딩'); break;
        default: assert.fail(`Missing real interaction: ${step.event}`);
      }
    }
    assert(container.querySelector('[aria-label="학습 완료"]'));
    assert.equal(apiCalls, 0, 'practice never invokes account/quote/order API');
    if (course.id === 'buy') {
      assert(container.textContent.includes('849,980원'), 'valid quantity other than the suggested ten is accepted');
      assert(container.textContent.includes('150,020원'));
    }
    if (course.id === 'review') {
      assert(container.textContent.includes('749,400원'));
      assert(container.textContent.includes('250,035원'));
    }
    await click(button('처음부터'));
    assert(container.querySelector('dialog[open]'));
    assert(!container.querySelector('[aria-label="학습 완료"]'));
  } finally { await act(async () => root.unmount()); }
});
