import test from 'node:test';
import assert from 'node:assert/strict';
import { TRADING_TUTORIALS } from '../src/constants/tradingTutorials.js';
import { createPracticeAccounts, executePracticeOrder } from '../src/utils/practiceAccount.js';
import { portfolioTotals } from '../src/api/normalize.js';

test('tours use site actions and contextual reading without fee-policy steps', () => {
  assert.equal(TRADING_TUTORIALS.length, 6);
  for (const course of TRADING_TUTORIALS) for (const step of course.steps) {
    assert(step.target && step.title && step.text);
    assert(step.event || step.read);
    assert(!('answer' in step));
    assert(!['costs', 'cost-rules'].includes(step.target));
  }
});

test('practice uses gross amounts only and preserves account isolation', () => {
  const initial = createPracticeAccounts();
  const request = { account_id: 2, symbol_code: '990001', quantity: 10, price: 1, order_type: '매수' };
  const buy = executePracticeOrder(initial, request);
  assert.equal(buy.accounts[1].withdrawable_cash, 500000);
  assert.equal(buy.accounts[1].basis, 500000);
  assert.equal(buy.result.price, 50000);
  assert(!('commission' in buy.result));
  assert.equal(initial[1].orders.length, 0);
  assert.deepEqual(buy.accounts[0], initial[0]);
  const sell = executePracticeOrder(buy.accounts, { ...request, quantity: 5, order_type: '매도' });
  assert.equal(sell.accounts[1].quantity, 5);
  assert.equal(sell.accounts[1].withdrawable_cash, 750000);
  assert.equal(sell.accounts[1].basis, 250000);
  assert.throws(() => executePracticeOrder(sell.accounts, { ...request, quantity: 6, order_type: '매도' }));
  assert.throws(() => executePracticeOrder(initial, { ...request, quantity: 21 }));
  assert.throws(() => executePracticeOrder(initial, { ...request, account_id: 1 }));
  const exact = executePracticeOrder(initial, { ...request, quantity: 20 });
  assert.equal(exact.accounts[1].withdrawable_cash, 0, 'no additional fee required');
});

test('portfolio totals use average fill price without fee-inclusive basis', () => {
  const holding = { hold_quantity: 5, avg_price: 50000, acquisition_cost: 250035, quote: { current_price: 50000 } };
  assert.deepEqual(portfolioTotals({ withdrawable_cash: 750000, holdings: [holding] }), { cash: 750000, cost: 250000, market: 250000, unrealized: 0, total: 1000000, debt: 0, pendingProceeds: 0 });
});
