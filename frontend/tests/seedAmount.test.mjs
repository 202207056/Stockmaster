import test from 'node:test';
import assert from 'node:assert/strict';
import { addSeedAmount, validSeedAmount } from '../src/utils/seedAmount.js';

test('amount buttons add repeatedly, respect the cap and allow restarting at zero', () => {
  let amount = '10000000';
  amount = addSeedAmount(amount, 1000000);
  amount = addSeedAmount(amount, 1000000);
  assert.equal(amount, '12000000');
  assert.equal(addSeedAmount(amount, 100000000), amount);
  assert.equal(addSeedAmount('0', 100000000), '100000000');
  assert.equal(addSeedAmount('', 1000000), '1000000');
});
test('only whole won within the supported range can be submitted', () => {
  for (const amount of ['100000', '12000000', '100000000']) assert(validSeedAmount(amount));
  for (const amount of ['', '0', '-1', '99999', '100000001', '100000.5', 'Infinity']) assert(!validSeedAmount(amount));
});
