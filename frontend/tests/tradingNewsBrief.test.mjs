import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', envFile: false });
const { default: Brief } = await server.ssrLoadModule('/src/components/common/TradingNewsBrief.jsx');
const client = await server.ssrLoadModule('/src/api/client.js');
client.default.defaults.adapter = async () => assert.fail('Mock news must not request a backend');
after(async () => { await server.close(); dom.window.close(); });

test('banner opens an in-page mock briefing, themes toggle, Escape restores focus and scroll', async () => {
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(Brief, { code: '005930' })));
    const banner = document.querySelector('.trading-news-banner');
    assert.doesNotMatch(banner.textContent, /예시|AI 한줄요약/i);
    banner.focus();
    await React.act(async () => banner.click());
    const dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.doesNotMatch(dialog.textContent, /예시|AI 한줄요약/i);
    assert.ok(dialog.previousElementSibling.classList.contains('bg-transparent'));
    dialog.getBoundingClientRect = () => {
      const [dx, dy] = (dialog.style.transform.match(/-?\d+(?:\.\d+)?/g) || [0, 0]).map(Number);
      return { left: 200 + dx, top: 100 + dy, width: 600, height: 400 };
    };
    const handle = dialog.querySelector('[aria-label="AI 뉴스 팝업 이동"]');
    const pointer = (type, x, y) => {
      const event = new dom.window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      handle.dispatchEvent(event);
    };
    await React.act(async () => { pointer('pointerdown', 250, 120); pointer('pointermove', 290, 150); pointer('pointerup', 290, 150); });
    assert.equal(dialog.style.transform, 'translate(40px, 30px)');
    await React.act(async () => handle.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    assert.equal(dialog.style.transform, 'translate(56px, 30px)');
    await React.act(async () => { pointer('pointerdown', 300, 150); pointer('pointermove', -1000, -1000); pointer('pointercancel', -1000, -1000); });
    assert.ok(dialog.getBoundingClientRect().left < 0);
    assert.ok(dialog.getBoundingClientRect().top < 0);
    await React.act(async () => { pointer('pointerdown', 0, 0); pointer('pointermove', 3000, 3000); pointer('pointerup', 3000, 3000); });
    assert.ok(dialog.getBoundingClientRect().left > window.innerWidth);
    assert.ok(dialog.getBoundingClientRect().top > window.innerHeight);
    const movedTransform = dialog.style.transform;
    await React.act(async () => window.dispatchEvent(new dom.window.Event('resize')));
    assert.equal(dialog.style.transform, movedTransform);
    assert.equal(document.body.style.overflow, 'hidden');
    assert.equal(dialog.querySelector('.trading-news-summary p').textContent,
      banner.querySelector('.trading-news-banner__headline').textContent);
    assert.equal(dialog.querySelectorAll('.trading-news-sections section').length, 3);
    assert.equal(dialog.querySelectorAll('.trading-news-related-card').length, 4);
    const relatedCards = [...dialog.querySelectorAll('.trading-news-related-card')];
    assert.deepEqual(relatedCards.map(card => card.textContent.includes('보유')), [true, false, true, false]);
    for (const [name, held] of [['삼성전자', true], ['DB하이텍', false], ['한미반도체', true], ['HPSP', false], ['SK하이닉스', true]]) {
      await React.act(async () => dialog.querySelector(`[aria-label="${name} 뉴스 상세 보기"]`).click());
      const detail = dialog.querySelector('.trading-news-main');
      assert.equal(detail.querySelector('h3').textContent, name);
      assert.equal(detail.querySelectorAll('.trading-news-sections section').length, 3);
      assert.equal(detail.querySelector('header').textContent.includes('주 보유'), held);
      assert.equal(document.activeElement, detail);
      assert.equal(dialog.querySelector(`[aria-label="${name} 뉴스 상세 보기"]`), null);
      assert.equal(dialog.querySelectorAll('.trading-news-related-card').length, 4);
      assert.equal(banner.querySelector('.trading-news-banner__headline').textContent, 'AI 인프라 관련 HBM 후속 협의');
    }
    assert.match(dialog.textContent, /오늘의 테마/);
    const theme = dialog.querySelector('.trading-news-themes h4 button');
    assert.equal(theme.getAttribute('aria-expanded'), 'true');
    await React.act(async () => theme.click());
    assert.equal(theme.getAttribute('aria-expanded'), 'false');
    await React.act(async () => dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.body.style.overflow, '');
    assert.equal(document.activeElement, banner);
    await React.act(async () => banner.click());
    assert.equal(document.querySelector('[role="dialog"]').style.transform, '');
    await React.act(async () => document.querySelector('[aria-label="닫기"]').click());
    assert.equal(document.querySelector('[role="dialog"]'), null);
  } finally { await React.act(async () => root.unmount()); }
});
