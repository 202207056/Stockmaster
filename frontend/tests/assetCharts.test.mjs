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

