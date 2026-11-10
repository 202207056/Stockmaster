import test from 'node:test';
import assert from 'node:assert/strict';
import { quotePreviousClose } from '../src/api/normalize.js';

test('previous close stays fixed through rising, falling and unchanged quotes', () => {
  assert.equal(quotePreviousClose({ current_price: 71000, change_amount: 1000, change_rate: 1.43 }), 70000);
  assert.equal(quotePreviousClose({ current_price: 69000, change_amount: 1000, change_rate: -1.43 }), 70000);
  assert.equal(quotePreviousClose({ current_price: 69000, change_amount: -1000, change_rate: -1.43 }), 70000);
  assert.equal(quotePreviousClose({ current_price: 70000, change_amount: 0, change_rate: 0 }), 70000);
  assert.equal(quotePreviousClose({ previous_close: 70000 }), 70000);
});

test('missing or inconsistent changes do not fabricate a previous close', () => {
  assert.equal(quotePreviousClose({ current_price: 70000, change_rate: 1.2 }), null);
  assert.equal(quotePreviousClose({ current_price: 70000, change_amount: 100, change_rate: 0 }), null);
  assert.equal(quotePreviousClose({ current_price: 100, change_amount: 200 }), null);
});
