import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: Favorites } = await server.ssrLoadModule('/src/pages/Favorites.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const library = await server.ssrLoadModule('/src/utils/favorites.js');
const { default: client } = await server.ssrLoadModule('/src/api/client.js');
client.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data:
  config.url.endsWith('/price') ? { current_price: 50000, change_rate: 1.5 } :
  config.url.endsWith('/logo') ? { symbol_code: '005930', logo_url: null } : { symbol_code: '005930', name: '테스트전자' },
});
const container = document.getElementById('root');
const button = text => [...container.querySelectorAll('button')].find(element => element.textContent.trim() === text);
async function click(element) { assert(element); await act(async () => element.click()); }
async function fill(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

test('recent view, star group creation, membership editing, rename, deletion and unfavorite work together', async () => {
  library.recordRecentStock('005930');
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(AuthContext.Provider, { value: { user: null, isAuthenticated: false } }, React.createElement(MemoryRouter, null, React.createElement(Favorites)))));
    await click(button('최근 조회'));
    assert(container.textContent.includes('테스트전자'));
    assert(!container.textContent.includes('005930'));
    assert.equal(container.querySelector('.text-blue-600').textContent, '+1.50%');
    await click(container.querySelector('[aria-label="관심종목 추가"]'));
    assert(container.querySelector('dialog[open]'));
    await fill(container.querySelector('[aria-label="새 그룹 이름"]'), '반도체');
    await click(button('그룹 추가'));
    assert(container.querySelector('input[type="checkbox"]').checked);
    await click(button('저장'));
    assert.deepEqual(library.getFavorites(), ['005930']);
    assert.deepEqual(library.getFavoriteGroups()[0].codes, ['005930']);
    await click(button('그룹'));
    assert(container.textContent.includes('테스트전자'));
    await click(button('이름 변경'));
    await fill(container.querySelector('[aria-label="그룹 이름 변경"]'), '장기 투자');
    await click(container.querySelector('form button[type="submit"]'));
    assert.equal(library.getFavoriteGroups()[0].name, '장기 투자');
    await click(container.querySelector('[aria-label="관심종목 그룹 편집"]'));
    await click(container.querySelector('input[type="checkbox"]'));
    await click(button('저장'));
    assert(container.textContent.includes('그룹에 담긴 종목이 없어요'));
    assert.deepEqual(library.getFavorites(), ['005930']);
    await click(button('그룹 삭제'));
    assert.equal(library.getFavoriteGroups().length, 0);
    await click(button('관심'));
    assert(container.textContent.includes('테스트전자'));
    await click(container.querySelector('[aria-label="관심종목 그룹 편집"]'));
    await click(button('관심 해제'));
    assert.deepEqual(library.getFavorites(), []);
    await click(button('최근 조회'));
    assert(container.textContent.includes('테스트전자'));
    await click(button('조회 기록 지우기'));
    assert(container.textContent.includes('최근 조회한 종목이 없어요'));
  } finally { await act(async () => root.unmount()); }
});
