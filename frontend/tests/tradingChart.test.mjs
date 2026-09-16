import test from 'node:test';
import assert from 'node:assert/strict';
import { chartRangeRows, chartHoverIndex } from '../src/utils/tradingChart.js';

test('ranges select a day, week, three months and year without mutating data', () => {
  const rows = ['2026-09-16', '2025-09-16', '2025-09-17', '2026-06-16', '2026-06-17', '2026-09-09', '2026-09-10'].map(date => ({ date }));
  const original = structuredClone(rows);
  assert.deepEqual(chartRangeRows(rows, 'D').map(r => r.date), ['2026-09-16']);
  assert.deepEqual(chartRangeRows(rows, 'W').map(r => r.date), ['2026-09-10', '2026-09-16']);
  assert.deepEqual(chartRangeRows(rows, 'M').map(r => r.date), ['2026-06-17', '2026-09-09', '2026-09-10', '2026-09-16']);
  assert.equal(chartRangeRows(rows, 'Y').length, 6);
  assert.deepEqual(rows, original);
  assert.deepEqual(chartRangeRows(), []);
});

test('calendar subtraction clamps leap days and month ends', () => {
  assert.deepEqual(chartRangeRows([{date:'2023-02-28'}, {date:'2023-03-01'}, {date:'2024-02-29'}], 'Y').map(r=>r.date), ['2023-03-01', '2024-02-29']);
  assert.deepEqual(chartRangeRows([{date:'2026-02-28'}, {date:'2026-03-01'}, {date:'2026-05-31'}], 'M').map(r=>r.date), ['2026-03-01', '2026-05-31']);
});

test('hover selects nearest price column and clamps both edges', () => {
  assert.equal(chartHoverIndex(20, 10), 0);
  assert.equal(chartHoverIndex(310, 10), 5);
  assert.equal(chartHoverIndex(600, 10), 9);
  assert.equal(chartHoverIndex(-10, 10), 0);
  assert.equal(chartHoverIndex(800, 10), 9);
  assert.equal(chartHoverIndex(310, 1), 0);
});
