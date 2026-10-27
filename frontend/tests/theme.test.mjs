import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', runScripts: 'outside-only' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Event = dom.window.Event;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const media = new dom.window.EventTarget();
media.matches = true;
dom.window.matchMedia = () => media;
const boot = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: ThemeToggle } = await server.ssrLoadModule('/src/components/common/ThemeToggle.jsx');

test('theme initializes before render, toggles all controls, persists and synchronizes system/storage changes', async () => {
  dom.window.eval(boot);
  assert.equal(document.documentElement.dataset.theme, 'dark');
  const root = createRoot(document.getElementById('root'));
  const buttons = () => [...document.querySelectorAll('button')];
  try {
    await React.act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(ThemeToggle), React.createElement(ThemeToggle))));
    await React.act(async () => buttons()[0].click());
    assert.equal(document.documentElement.dataset.theme, 'light');
    assert.equal(window.localStorage.getItem('stockmaster:theme'), 'light');
    assert(buttons().every(button => button.getAttribute('aria-label') === '다크 모드로 전환'));
    dom.window.eval(boot);
    assert.equal(document.documentElement.dataset.theme, 'light', 'saved light overrides dark OS on reload');
    await React.act(async () => media.dispatchEvent(new Event('change')));
    assert.equal(document.documentElement.dataset.theme, 'light', 'system changes do not overwrite explicit choice');
    await React.act(async () => {
      window.localStorage.removeItem('stockmaster:theme');
      window.dispatchEvent(new dom.window.StorageEvent('storage', { key: 'stockmaster:theme' }));
    });
    assert.equal(document.documentElement.dataset.theme, 'dark');
    await React.act(async () => { media.matches = false; media.dispatchEvent(new Event('change')); });
    assert.equal(document.documentElement.dataset.theme, 'light');
    const original = dom.window.Storage.prototype.setItem;
    dom.window.Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
    try {
      await React.act(async () => buttons()[0].click());
      assert.equal(document.documentElement.dataset.theme, 'dark');
      await React.act(async () => media.dispatchEvent(new Event('change')));
      assert.equal(document.documentElement.dataset.theme, 'dark', 'in-memory choice survives storage failures');
    } finally { dom.window.Storage.prototype.setItem = original; }
  } finally { await React.act(async () => root.unmount()); }
});

test('early initialization tolerates invalid or inaccessible saved preferences', () => {
  window.localStorage.setItem('stockmaster:theme', 'invalid');
  media.matches = true;
  dom.window.eval(boot);
  assert.equal(document.documentElement.dataset.theme, 'dark');
  const original = dom.window.Storage.prototype.getItem;
  dom.window.Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
  try { dom.window.eval(boot); assert.equal(document.documentElement.style.colorScheme, 'dark'); }
  finally { dom.window.Storage.prototype.getItem = original; }
});
