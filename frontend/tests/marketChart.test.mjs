import test from 'node:test';
import assert from 'node:assert/strict';
import { marketChartPoints } from '../src/utils/marketChart.js';

test('US close and early FX notifications use their own session', () => {
  for (const [start, end] of [['093000', '160000'], ['082000', '170000']]) {
    const points = marketChartPoints({ session_start: start, session_end: end, points: [
      { time: end, value: 102 }, { time: start, value: 100 },
      { time: '256000', value: 999 },
    ] });
    assert.equal(points.length, 2);
    assert.equal(points[0].x, 8);
    assert.equal(points[1].x, 88);
  }
  assert.deepEqual(marketChartPoints({ session_start: '160000', session_end: '090000' }), []);
});

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
