import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateOrderCosts } from '../src/utils/orderCosts.js';

test('mock fees round half won up and only sells pay tax', () => {
  assert.deepEqual(estimateOrderCosts('매수', 50000, 1), { gross: 50000, commission: 8, tax: 0, settlement: 50008 });
  assert.deepEqual(estimateOrderCosts('매도', 50000, 1), { gross: 50000, commission: 8, tax: 90, settlement: 49902 });
  assert.equal(estimateOrderCosts('매도', 2500, 1).tax, 5);
  assert.equal(estimateOrderCosts('매수', 1000, 10).commission, 2);
});

test('invalid or unsafe amounts cannot be estimated', () => {
  for (const price of [null, 0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.equal(estimateOrderCosts('매수', price, 1), null);
  }
  assert.equal(estimateOrderCosts('매수', -100, -1), null);
  assert.equal(estimateOrderCosts('매수', 100, 0.5), null);
});
