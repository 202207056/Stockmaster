import test from 'node:test';
import assert from 'node:assert/strict';
import { marketChartPoints } from '../src/utils/marketChart.js';

test('one-day chart keeps real turns and scales time across the full session', () => {
  const points = marketChartPoints({ points: [
    { time: '153000', value: 101 }, { time: '090000', value: 100 },
    { time: '120000', value: 103 }, { time: '130000', value: null },
    { time: '160000', value: 999 },
  ] });
  assert.equal(points.length, 3);
  assert.equal(points[0].x, 8);
  assert.equal(points[2].x, 88);
  assert.ok(points[1].y < points[0].y && points[1].y < points[2].y);
});

test('flat charts remain centered; missing or single points never create a fake line', () => {
  assert.deepEqual(marketChartPoints(undefined), []);
  assert.deepEqual(marketChartPoints({ points: [{ time: '090000', value: 100 }] }), []);
  const points = marketChartPoints({ points: [{ time: '090000', value: 100 }, { time: '100000', value: 100 }] });
  assert.ok(points.every((point) => point.y === 48));
  assert.ok(points[1].x < 88);
});
