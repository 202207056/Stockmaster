import test from 'node:test';
import assert from 'node:assert/strict';
import { chartRows, portfolioTotals, quotePrice, safeExternalUrl, requireArray, numberOrNull } from '../src/api/normalize.js';

test('missing and invalid prices never become a zero-valued asset', () => {
  for (const value of [null, undefined, '', '  ', false, [], {}, 'bad', Infinity]) assert.equal(numberOrNull(value), null);
  for (const value of [0, -1, null, 'bad']) assert.equal(quotePrice({ current_price: value }), null);
  assert.equal(quotePrice({ current_price: '75000' }), 75000);
});

test('cash plus market value preserves assets on a same-price purchase', () => {
  const before = portfolioTotals({ withdrawable_cash: '10000000', holdings: [] });
  const after = portfolioTotals({ withdrawable_cash: '9000000', holdings: [{ hold_quantity: 10, avg_price: '100000', quote: { current_price: 100000 } }] });
  assert.equal(after.total, before.total);
  assert.equal(after.unrealized, 0);
  assert.equal(after.cost, 1000000);
});

test('a missing holding quote hides aggregate market value and profit', () => {
  const result = portfolioTotals({ withdrawable_cash: 100, holdings: [
    { hold_quantity: 2, avg_price: 50, quote: { current_price: 60 } },
    { hold_quantity: 1, avg_price: 100, quote: null },
  ] });
  assert.deepEqual(result, { cash: 100, cost: 200, market: null, unrealized: null, total: null });
});

test('invalid cash does not turn into a complete total', () => {
  assert.equal(portfolioTotals({ withdrawable_cash: null, holdings: [] }).total, null);
});

test('chart sorts and deduplicates valid days and rejects malformed OHLC and dates', () => {
  const candle = { open: 10, high: 15, low: 8, close: 12 };
  const rows = chartRows([
    { ...candle, date: '20260908' }, { ...candle, date: '2026-09-07' },
    { ...candle, close: 14, date: '20260908' }, { ...candle, date: '20260230' },
    { ...candle, low: 13, date: '20260906' }, { ...candle, high: 0, date: '20260905' },
  ]);
  assert.deepEqual(rows.map((row) => row.date), ['2026-09-07', '2026-09-08']);
  assert.equal(rows[1].close, 14);
});

test('unexpected API response is an error rather than an empty success', () => {
  assert.throws(() => requireArray({ detail: 'failed' }));
  assert.throws(() => chartRows(null));
});

test('news links permit only HTTP and HTTPS', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('data:text/html,example'), null);
  assert.equal(safeExternalUrl('https://example.com/news'), 'https://example.com/news');
});
