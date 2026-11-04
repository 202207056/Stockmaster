import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: Signup } = await server.ssrLoadModule('/src/pages/Signup.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { default: api } = await server.ssrLoadModule('/src/api/client.js');

test('signup requires a fresh check, ignores stale responses, and retries failed checks', async () => {
  const root = createRoot(document.getElementById('root'));
  const calls = [];
  let registered;
  api.defaults.adapter = config => new Promise((resolve, reject) => calls.push({ config,
    resolve: available => resolve({ data: { login_id: config.params.login_id, available }, status: 200, statusText: 'OK', headers: {}, config }), reject }));
  const input = label => document.getElementById([...document.querySelectorAll('label')].find(el => el.textContent === label).htmlFor);
  const fill = (label, value) => React.act(async () => {
    const el = input(label);
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  const check = () => React.act(async () => [...document.querySelectorAll('button')].find(el => /중복확인|확인 중|확인 완료/.test(el.textContent)).click());
  const submit = () => React.act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  try {
    await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value: { signup: async data => { registered = data; } } },
      React.createElement(MemoryRouter, null, React.createElement(Signup)))));
    await fill('아이디', 'abc');
    await check();
    assert.equal(calls.length, 0);
    assert.match(document.body.textContent, /4~20자/);
    await fill('아이디', 'first_user');
    await fill('비밀번호', 'pass1234');
    await fill('비밀번호 확인', 'pass1234');
    await fill('이름', 'Test');
    await fill('이메일', 'test@example.com');
    await submit();
    assert.equal(registered, undefined);
    assert.match(document.body.textContent, /중복확인을 해 주세요/);
    await check();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].config.cache, false);
    assert.equal(document.querySelector('[type="submit"]').disabled, true);
    await fill('아이디', 'second_user');
    await React.act(async () => calls[0].resolve(true));
    assert.doesNotMatch(document.body.textContent, /사용 가능한 아이디/);
    await check();
    await React.act(async () => calls[1].resolve(false));
    assert.match(document.body.textContent, /이미 사용 중/);
    await submit();
    assert.equal(registered, undefined);
    await fill('아이디', 'third_user');
    await check();
    await React.act(async () => calls[2].reject(Error('offline')));
    assert.match(document.body.textContent, /다시 시도/);
    await check();
    await React.act(async () => calls[3].resolve(true));
    assert.match(document.body.textContent, /사용 가능한 아이디/);
    // Editing away and back also invalidates an earlier successful check.
    await fill('아이디', 'fourth_user');
    await fill('아이디', 'third_user');
    await submit();
    assert.equal(registered, undefined);
    await check();
    await React.act(async () => calls[4].resolve(true));
    await submit();
    assert.deepEqual(registered, { loginId: 'third_user', passwd: 'pass1234', userName: 'Test', email: 'test@example.com' });
  } finally { await React.act(async () => root.unmount()); }
});
