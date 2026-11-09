import test from 'node:test';
import assert from 'node:assert/strict';
import { placeEdgeTab } from '../src/utils/edgeTabGeometry.js';

test('drag follows intermediate x instead of jumping to an edge', () => {
  assert.deepEqual(placeEdgeTab({ x: 165, y: 200 }, { width: 390, height: 780 }), { x: 165, y: 200 });
});

test('nearest free slots keep the tabs apart, including both viewport boundaries', () => {
  for (const width of [320, 390, 430]) for (const height of [200, 504, 780]) {
    for (const x of [0, width - 30]) for (const obstacleY of [76, Math.floor(height / 2), height - 56]) {
      const other = { x, y: obstacleY };
      for (let y = -100; y < height + 100; y += 7) {
        const next = placeEdgeTab({ x, y }, { width, height }, [other]);
        assert(next.x >= 0 && next.x + 30 <= width);
        assert(next.y >= 0 && next.y + 48 <= height);
        assert(Math.abs(next.x - other.x) >= 38 || Math.abs(next.y - other.y) >= 56);
      }
    }
  }
});

test('a short viewport uses the other edge when there is no vertical slot', () => {
  assert.deepEqual(placeEdgeTab({ x: 290, y: 76 }, { width: 320, height: 130 }, [{ x: 290, y: 74 }]), { x: 0, y: 74 });
});
