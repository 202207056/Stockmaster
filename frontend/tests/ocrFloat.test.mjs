import test from 'node:test';
import assert from 'node:assert/strict';
import { anchorFromRect, BUTTON, clampRect, DEFAULT_ANCHOR, MIN_PANEL, rectFromAnchor, resizeRect } from '../src/components/ai/term-analyzer/floatGeometry.js';

const wide = { width: 1600, height: 1000 };
const small = { width: 700, height: 500 };

test('a shrinking window pulls the button and the panel back inside', () => {
  const anchor = anchorFromRect({ x: 1400, y: 100, w: 56, h: 56 }, wide);
  assert.deepEqual(anchor, { h: 'right', dx: 144, v: 'top', dy: 100 });
  const button = rectFromAnchor(anchor, BUTTON, small);
  assert.ok(button.x + button.w <= small.width - 8 && button.x >= 8);
  const panel = rectFromAnchor(anchor, { w: 900, h: 900 }, small);
  assert.deepEqual(panel, { x: 8, y: 8, w: 684, h: 484 });
});

test('the panel opens from the button corner and the button returns there', () => {
  const button = rectFromAnchor(DEFAULT_ANCHOR, BUTTON, wide);
  const panel = rectFromAnchor(DEFAULT_ANCHOR, { w: 430, h: 640 }, wide);
  assert.equal(panel.x + panel.w, button.x + button.w);
  assert.equal(panel.y + panel.h, button.y + button.h);
  const moved = anchorFromRect({ ...panel, x: 100, y: 120 }, wide);
  const back = rectFromAnchor(moved, BUTTON, wide);
  assert.deepEqual([back.x, back.y], [100, 120]);
});

test('resizing keeps the opposite edges and the minimum size', () => {
  const start = { x: 400, y: 200, w: 430, h: 600 };
  assert.deepEqual(resizeRect(start, 'se', 100, 50, wide), { x: 400, y: 200, w: 530, h: 650 });
  assert.deepEqual(resizeRect(start, 'nw', 1000, 1000, wide), { x: 830 - MIN_PANEL.w, y: 800 - MIN_PANEL.h, w: MIN_PANEL.w, h: MIN_PANEL.h });
  assert.deepEqual(resizeRect(start, 'w', -1000, 0, wide), { x: 8, y: 200, w: 822, h: 600 });
  assert.deepEqual(clampRect({ x: -50, y: 2000, w: 56, h: 56 }, wide), { x: 8, y: 936, w: 56, h: 56 });
});

test('the panel keeps its top-left corner and is pushed up only when there is no room below', async () => {
  const { placePanel } = await import('../src/components/ai/term-analyzer/floatGeometry.js');
  const view = { width: 1200, height: 800 };
  assert.equal(placePanel({ x: 300, y: 100 }, 380, 400, view).top, '100px');
  assert.equal(placePanel({ x: 300, y: 600 }, 380, 400, view).top, '392px');
  const huge = placePanel({ x: 1100, y: 600 }, 380, 2000, view);
  assert.deepEqual([huge.left, huge.top, huge.height], ['812px', '8px', '784px']);
  assert.equal(placePanel({ x: -50, y: -50 }, 380, 0, view).height, undefined);
});
