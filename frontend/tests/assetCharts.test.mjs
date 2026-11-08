import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssetWeek, portfolioSlices } from '../src/utils/assetCharts.js';

test('weekly server history validates account, dates and missing days without filling gaps', () => {
  const data = { account_id: 1, timezone: 'Asia/Seoul', week_start: '2026-11-02', week_end: '2026-11-08',
    rows: [{ date: '2026-11-04', total: '1000.50' }, { date: '2026-11-02', total: 0 }] };
  const result = parseAssetWeek(data, 1);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].value, 0);
  assert.equal(result.rows[1].value, 1000.5);
  assert.throws(() => parseAssetWeek(data, 2));
  assert.throws(() => parseAssetWeek({ ...data, week_end: '2026-11-10' }, 1));
  assert.throws(() => parseAssetWeek({ ...data, rows: [{ date: '2026-10-31', total: 5 }] }, 1));
  assert.throws(() => parseAssetWeek({ ...data, rows: [{ date: '2026-11-02', total: null }] }, 1));
  assert.throws(() => parseAssetWeek({ ...data, rows: [data.rows[0], data.rows[0]] }, 1));
});

test('portfolio allocation aggregates actual valuation, rejects incomplete quotes, and ignores zero holdings', () => {
  const holding = (code, quantity, price) => ({ symbol_code: code, hold_quantity: quantity, quote: { current_price: price } });
  assert.deepEqual(portfolioSlices([holding('A', 2, 100), holding('B', 1, 50), holding('A', 1, 100)]), [
    { code: 'A', name: 'A', value: 300 }, { code: 'B', name: 'B', value: 50 },
  ]);
  assert.equal(portfolioSlices([holding('A', 2, null)]), null);
  assert.deepEqual(portfolioSlices([holding('A', 0, null)]), []);
});


import { assetComparison, assetDateTime, assetWeekOffset, assetWeekStart, koreaDate } from '../src/utils/assetCharts.js';

test('calendar dates use Korean weeks across year boundaries and validate the API range', () => {
  assert.equal(koreaDate(new Date('2026-11-08T16:00:00Z')), '2026-11-09');
  assert.equal(assetWeekOffset('2025-12-31', '2026-01-05'), 1);
  assert.equal(assetWeekOffset('2026-01-04', '2026-01-05'), 1);
  assert.equal(assetWeekOffset('2026-01-05', '2026-01-05'), 0);
  assert.equal(assetWeekOffset('2026-01-06', '2026-01-05'), null);
  assert.equal(assetWeekOffset('2026-02-30', '2026-03-01'), null);
  assert.equal(assetWeekOffset('', '2026-03-01'), null);
  const oldest = new Date(assetWeekStart('2026-11-08') - 520 * 7 * 86400000).toISOString().slice(0, 10);
  assert.equal(assetWeekOffset(oldest, '2026-11-08'), 520);
  assert.equal(assetWeekOffset('2000-01-01', '2026-11-08'), null);
});

test('asset changes compare exact dates and displayed won, preserving missing and demo states', () => {
  const rows = [{ time: assetDateTime('2026-11-02'), value: 1000.5 }, { time: assetDateTime('2026-11-03'), value: 0 }, { time: assetDateTime('2026-11-04'), value: 100, isDemo: true }];
  assert.deepEqual(assetComparison(rows, '2026-11-02', 1200.5), { previous: 1001, current: 1201, difference: 200, date: '2026-11-02' });
  assert.equal(assetComparison(rows, '2026-11-02', 900).difference, -101);
  assert.equal(assetComparison(rows, '2026-11-03', 0).difference, 0);
  assert.equal(assetComparison(rows, '2026-11-05', 100).date, '2026-11-03');
  assert.equal(assetComparison(rows, '2026-11-04', 100).date, '2026-11-03');
  assert.equal(assetComparison(rows, '2026-11-02', null), null);
});

test('fallback crosses empty weeks without using future or demo records', () => {
  const data = { account_id: 1, timezone: 'Asia/Seoul', week_start: '2026-11-02', week_end: '2026-11-08', rows: [], previous: { date: '2026-10-20', total: 500 } };
  const parsed = parseAssetWeek(data, 1);
  assert.deepEqual(assetComparison(parsed.rows, '2026-11-04', 700, parsed.previous), { previous: 500, current: 700, difference: 200, date: '2026-10-20' });
  assert.equal(assetComparison([{time: assetDateTime('2026-11-05'), value: 10}], '2026-11-04', 20), null);
  assert.equal(assetComparison([], '2026-11-04', 20), null);
  assert.throws(() => parseAssetWeek({...data, previous: {date: '2026-11-02', total: 1}}, 1));
});

import { parseAssetRange } from '../src/utils/assetCharts.js';
test('range history supports multiple weeks and same-day windows', () => {
  const data = {account_id: 1, timezone: 'Asia/Seoul', start_date: '2026-10-20', end_date: '2026-11-08', rows: [{date: '2026-10-20', total: 100}, {date: '2026-11-07', total: 180}]};
  const parsed = parseAssetRange(data, 1);
  const end = assetComparison(parsed.rows, data.end_date, 0, parsed.previous);
  assert.equal(assetComparison(parsed.rows, data.start_date, end.previous, parsed.previous).difference, 80);
  assert.equal(parseAssetRange({...data, end_date: data.start_date, rows: [data.rows[0]]}, 1).rows.length, 1);
  assert.throws(() => parseAssetRange({...data, end_date: '2026-10-19'}, 1));
  assert.throws(() => parseAssetRange(data, 2));
});
