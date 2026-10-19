import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/learn' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: Glossary } = await server.ssrLoadModule('/src/components/learn/GlossaryBrowser.jsx');

test('glossary cards navigate, conceptual cards stay static, and related terms still search', async () => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  function Location() { const location = useLocation(); return React.createElement('output', {}, location.pathname); }
  const card = term => [...container.querySelectorAll('article')].find(node => node.querySelector('h3').textContent.startsWith(term));
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/learn'] }, React.createElement(Glossary), React.createElement(Location))));
    assert.equal(card('주식').querySelector('a'), null);
    assert.equal(card('주주').querySelector('a'), null);
    await React.act(async () => card('캔들차트').querySelector('a').click());
    assert.equal(container.querySelector('output').textContent, '/learn/charts');
    await React.act(async () => card('주식').querySelector('button').click());
    assert.equal(container.querySelector('input').value, '주주');
    assert.equal(container.querySelector('output').textContent, '/learn/charts');
  } finally { await React.act(async () => root.unmount()); }
});
