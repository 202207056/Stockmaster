import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true, ResizeObserver: class { observe() {} disconnect() {} } });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: FloatingTutorial } = await server.ssrLoadModule('/src/components/common/FloatingTutorial.jsx');
const { default: useTutorialSetting } = await server.ssrLoadModule('/src/hooks/useTutorialSetting.js');
const { default: usePopupSetting } = await server.ssrLoadModule('/src/hooks/useTutorialPopupSetting.js');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const h = React.createElement;
function Settings() {
  const [enabled, setEnabled] = useTutorialSetting();
  const [visible, setVisible] = usePopupSetting();
  return h('div', null, h('button', { id: 'guide-setting', onClick: () => setEnabled(!enabled) }, String(enabled)),
    h('button', { id: 'popup-setting', onClick: () => setVisible(!visible) }, String(visible)));
}
const click = async selector => React.act(async () => document.querySelector(selector).click());

test('quick switch syncs preferences, hide preserves guidance, restore and movement persist', async () => {
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/community'] }, h(AuthContext.Provider, { value: { isAuthenticated: true } }, h(FloatingTutorial), h(Settings)))));
    assert.equal(document.querySelector('[role="switch"]').getAttribute('aria-checked'), 'true');
    await click('[role="switch"]');
    assert.equal(document.querySelector('#guide-setting').textContent, 'false');
    assert.equal(localStorage.getItem('stockmaster:tutorials-enabled'), 'false');
    await click('#guide-setting');
    assert.equal(document.querySelector('[role="switch"]').getAttribute('aria-checked'), 'true');
    const before = JSON.parse(localStorage.getItem('stockmaster:tutorial-popup-position'));
    await React.act(async () => document.querySelector('.floating-tutorial-switch').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    assert.equal(JSON.parse(localStorage.getItem('stockmaster:tutorial-popup-position')).x, before.x - 16);
    await click('#popup-setting');
    assert.equal(document.querySelector('aside'), null);
    assert.equal(localStorage.getItem('stockmaster:tutorial-popup-enabled'), 'false');
    assert.equal(localStorage.getItem('stockmaster:tutorials-enabled'), 'true');
    await click('#popup-setting');
    assert(document.querySelector('aside'));
    await React.act(async () => {
      window.innerWidth = 390; window.innerHeight = 400;
      window.dispatchEvent(new Event('resize'));
    });
    const position = JSON.parse(localStorage.getItem('stockmaster:tutorial-popup-position'));
    assert(position.x >= 8 && position.x + 78 <= 382);
    assert(position.y >= 8 && position.y + 44 <= 392);
    await React.act(async () => {
      localStorage.setItem('stockmaster:tutorials-enabled', 'false');
      window.dispatchEvent(new dom.window.StorageEvent('storage', { key: 'stockmaster:tutorials-enabled' }));
    });
    assert.equal(document.querySelector('[role="switch"]').getAttribute('aria-checked'), 'false');
  } finally { await React.act(async () => root.unmount()); }
});

test('popup does not cover authentication, onboarding or active walkthroughs', async () => {
  for (const [path, authenticated] of [['/login', false], ['/community', false], ['/survey', true], ['/dashboard?tour=start', true], ['/trading?practice=buy', true], ['/learn/tutorial/buy', true]]) {
    const root = createRoot(document.getElementById('root'));
    try {
      await React.act(async () => root.render(h(MemoryRouter, { initialEntries: [path] }, h(AuthContext.Provider, { value: { isAuthenticated: authenticated } }, h(FloatingTutorial)))));
      assert.equal(document.querySelector('aside'), null, path);
    } finally { await React.act(async () => root.unmount()); }
  }
});
