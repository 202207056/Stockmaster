import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: ProfileSettings } = await server.ssrLoadModule('/src/components/common/ProfileSettings.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');

test('profile preserves edits after failure, retries, and supports removing the photo', async () => {
  let fail = true;
  let payload;
  const root = createRoot(document.getElementById('root'));
  const value = { user: { user_id: 1, user_name: 'Before', profile_image: 'data:image/png;base64,abc' },
    updateProfile: async profile => { payload = profile; if (fail) throw Error('offline'); return profile; } };
  try {
    await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value }, React.createElement(ProfileSettings))));
    assert(document.querySelector('img'));
    await React.act(async () => {
      const input = document.getElementById('profile-nickname');
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '  After  ');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      [...document.querySelectorAll('button')].find(el => el.textContent === '사진 삭제').click();
    });
    assert.equal(document.querySelector('img'), null);
    const submit = () => React.act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    await submit();
    assert(document.querySelector('[role="alert"]'));
    assert.equal(document.getElementById('profile-nickname').value, '  After  ');
    fail = false;
    await submit();
    assert.deepEqual(payload, { user_name: 'After', profile_image: null });
    assert.equal(document.querySelector('[role="alert"]'), null);
    assert(document.querySelector('[role="status"]').textContent.includes('저장했어요'));
    assert.equal(document.getElementById('profile-nickname').value, 'After');
  } finally { await React.act(async () => root.unmount()); }
});
