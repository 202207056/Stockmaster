import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readVisiblePageText } from '../src/features/ocr/pageText.js';
import { overlap, sourceRect } from '../src/features/ocr/regionImage.js';

// Each paragraph is laid out on its own 20px row; the range rectangle follows the node being measured.
function layout(html) {
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const rows = new Map([...dom.window.document.querySelectorAll('p')].map((p, index) => [p, index]));
  dom.window.Range.prototype.getClientRects = function getClientRects() {
    const row = rows.get(this.startContainer.parentElement) ?? 0;
    return [{ left: 0, right: 200, top: row * 20, bottom: row * 20 + 18, width: 200, height: 18 }];
  };
  return dom;
}

test('a dragged region reads only the text drawn inside it', () => {
  const dom = layout('<p>매수</p><p>영업이익</p><p>배당</p><div class="ocr-widget"><p>매도</p></div>');
  const text = readVisiblePageText(dom.window.document.body, { left: 0, top: 25, right: 200, bottom: 45 });
  assert.equal(text, '영업이익\n배당');
});

test('without a region the whole rendered page is read as before', () => {
  const dom = layout('<p>매수</p><p>영업이익</p><p>배당</p>');
  assert.equal(readVisiblePageText(dom.window.document.body), '매수\n영업이익\n배당');
});

test('picture pieces map the visible part back to the image pixels', () => {
  const rect = { left: 100, top: 50, right: 300, bottom: 150, width: 200, height: 100 };
  const part = overlap(rect, { left: 200, top: 0, right: 400, bottom: 100 });
  assert.deepEqual(part, { left: 200, top: 50, right: 300, bottom: 100 });
  assert.deepEqual(sourceRect(part, rect, 400, 200), { x: 200, y: 0, w: 200, h: 100 });
  assert.equal(overlap(rect, { left: 0, top: 0, right: 50, bottom: 50 }), null);
});
