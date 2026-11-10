import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: CreateAccount } = await server.ssrLoadModule('/src/components/common/CreateAccount.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { default: api } = await server.ssrLoadModule('/src/api/client.js');

test('create with accumulated money, retry refresh without duplicate creation, select new account', async () => {
  let calls = 0; let payload; let selected;
  const created = { account_id: 8, account_name: 'Long term', account_number: 'SM-0000-0000-0008' };
  api.defaults.adapter = async config => { calls++; payload = JSON.parse(config.data); return { data: created, status: 200, statusText: 'OK', headers: {}, config }; };
  const root = createRoot(document.getElementById('root'));
  const value = { isAuthenticated: true, accounts: [], refresh: async () => { throw Error('offline'); }, selectAccount: id => { selected = id; } };
  const render = () => React.act(async () => root.render(React.createElement(AuthContext.Provider, {value: {...value}}, React.createElement(CreateAccount))));
  const click = text => React.act(async () => [...document.querySelectorAll('button')].find(el => el.textContent === text).click());
  const submit = () => React.act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  try {
    await render(); await click('새 계좌 만들기');
    await React.act(async () => {
      const input = document.getElementById('new-account-name');
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, ' Long term ');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    await click('+1,000,000원'); await click('+1,000,000원');
    assert.equal(document.getElementById('new-account-amount').value, '12,000,000');
    await submit();
    assert.deepEqual(payload, { account_name: 'Long term', initial_balance: 12000000 });
    assert(document.body.textContent.includes(created.account_number));
    assert(document.querySelector('[role="alert"]'));
    await submit(); assert.equal(calls, 1);
    value.accounts = [created]; value.refresh = async () => {};
    await render();
    assert.equal(selected, 8);
    await click('닫기'); await click('새 계좌 만들기');
    assert.equal(document.getElementById('new-account-name').value, '');
    assert.equal(document.getElementById('new-account-amount').value, '10,000,000');
  } finally { await React.act(async () => root.unmount()); }
});
