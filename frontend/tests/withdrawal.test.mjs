import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  CustomEvent: dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: DeleteMembership } = await server.ssrLoadModule('/src/components/common/DeleteMembership.jsx');
const { default: AuthProvider } = await server.ssrLoadModule('/src/contexts/AuthContext.jsx');
const { default: useAuth } = await server.ssrLoadModule('/src/hooks/useAuth.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const h = React.createElement;
function Surface() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return h(React.Fragment, null, h('output', null, `${isAuthenticated}:${location.pathname}`), isAuthenticated && h(DeleteMembership));
}
const button = label => [...document.querySelectorAll('button')].find(element => element.textContent === label);
const click = async label => { assert(button(label)); await React.act(async () => button(label).click()); };
async function fillPassword(value) {
  await React.act(async () => {
    const input = document.querySelector('input[type=password]');
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

test('withdrawal requires confirmation, preserves session on failure, clears it only after success', async () => {
  localStorage.clear();
  client.setToken('withdrawal-test');
  localStorage.setItem('gp_favorites:user:1', '["TEST"]');
  localStorage.setItem('gp_favorites:user:1:groups', '[{"name":"private"}]');
  localStorage.setItem('gp_favorites:user:2', '["OTHER"]');
  let calls = 0;
  let fail = true;
  let finish;
  client.default.defaults.adapter = async config => {
    let data;
    if (config.method === 'delete') {
      calls++;
      assert.equal(config.url, '/users/me');
      assert.equal(JSON.parse(config.data).passwd, 'secret');
      if (fail) throw Object.assign(new Error('Wrong password'), { isAxiosError: true, response: { status: 400, data: { detail: '현재 비밀번호가 일치하지 않습니다.' } }, config });
      await new Promise(resolve => { finish = resolve; });
    } else if (config.url === '/users/me') data = { user_id: 1, user_name: 'Test' };
    else if (config.url === '/trading/accounts') data = [{ account_id: 7 }];
    else assert.fail(`Unexpected request: ${config.url}`);
    return { data, status: config.method === 'delete' ? 204 : 200, statusText: 'OK', headers: {}, config };
  };
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/mypage'] }, h(AuthProvider, null, h(Surface)))));
    await click('회원탈퇴하기');
    assert(button('영구 탈퇴').disabled);
    await click('취소');
    assert(!document.querySelector('dialog'));
    assert.equal(calls, 0);
    await click('회원탈퇴하기');
    await fillPassword('secret');
    assert(button('영구 탈퇴').disabled);
    await React.act(async () => document.querySelector('input[type=checkbox]').click());
    await click('영구 탈퇴');
    assert(document.body.textContent.includes('현재 비밀번호가 일치하지 않습니다.'));
    assert.equal(client.getToken(), 'withdrawal-test');
    assert.equal(document.querySelector('input[type=password]').value, '');
    fail = false;
    await fillPassword('secret');
    await click('영구 탈퇴');
    assert(button('처리 중…').disabled);
    assert(button('취소').disabled);
    await React.act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(calls, 2, 'duplicate submit ignored');
    await React.act(async () => finish());
    assert.equal(client.getToken(), null);
    assert.equal(localStorage.getItem('gp_account_id'), null);
    assert.equal(localStorage.getItem('gp_favorites:user:1'), null);
    assert.equal(localStorage.getItem('gp_favorites:user:1:groups'), null);
    assert.equal(localStorage.getItem('gp_favorites:user:2'), '["OTHER"]');
    assert.equal(document.querySelector('output').textContent, 'false:/withdrawal-complete');
  } finally { await React.act(async () => root.unmount()); }
});
