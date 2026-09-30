import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateCosts, TRADING_POLICY } from '../src/utils/tradingCosts.js';
import { TRADING_TUTORIALS } from '../src/constants/tradingTutorials.js';
import { createPracticeAccounts, executePracticeOrder } from '../src/utils/practiceAccount.js';
import { portfolioTotals, holdingCost } from '../src/api/normalize.js';

test('current equity costs: fees on both sides, separate sell taxes, integer boundaries', () => {
  const buy = calculateCosts(50000, 10, '매수', 'KOSPI');
  assert.equal(buy.commission, 70); assert.equal(buy.cash_delta, -500070);
  assert.equal(buy.transaction_tax + buy.rural_tax, 0);
  const sell = calculateCosts(50000, 5, '매도', 'KOSPI');
  assert.equal(sell.commission, 30); assert.equal(sell.transaction_tax, 125);
  assert.equal(sell.rural_tax, 375); assert.equal(sell.cash_delta, 249470);
  const kosdaq = calculateCosts(50000, 5, '매도', 'KOSDAQ');
  assert.equal(kosdaq.transaction_tax, 500); assert.equal(kosdaq.rural_tax, 0);
  assert.equal(calculateCosts(66666, 1, '매수', 'KOSPI').commission, 0);
  assert.equal(calculateCosts(66667, 1, '매수', 'KOSPI').commission, 10);
  assert.equal(calculateCosts(1999, 1, '매도', 'KOSPI').transaction_tax, 0);
  assert.equal(calculateCosts(1999, 1, '매도', 'KOSPI').rural_tax, 2);
  for (const price of [0, -1, NaN, Infinity, 0.1]) assert.throws(() => calculateCosts(price, 1, '매수', 'KOSPI'));
  assert.throws(() => calculateCosts(100, 1, '매수', 'ETF'));
  assert.throws(() => calculateCosts(100, 1, '취소', 'KOSPI'));
});

test('frontend/backend policy fixtures remain identical', () => {
  // Run this cross-repository check when both sibling checkouts are available.
  let raw;
  try { raw = readFileSync(new URL('../../../gp-mock-inv/backend/app/services/trading_policy.json', import.meta.url), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  assert.deepEqual(JSON.parse(raw), TRADING_POLICY);
});

test('tours have only site operations and contextual reading, no answer model', () => {
  assert.equal(TRADING_TUTORIALS.length, 6);
  for (const course of TRADING_TUTORIALS) {
    assert(!course.title.includes('?'));
    for (const step of course.steps) {
      assert(step.target && step.title && step.text);
      assert(step.event || step.read);
      assert(!('answer' in step) && !('kind' in step));
    }
  }
});

test('practice transactions charge costs, preserve other accounts, reject overselling and use fixed fill price', () => {
  const initial = createPracticeAccounts();
  const request = { account_id: 2, symbol_code: '990001', quantity: 10, price: 1, cost_policy_version: TRADING_POLICY.version, order_type: '매수' };
  const buy = executePracticeOrder(initial, request);
  assert.equal(buy.accounts[1].withdrawable_cash, 499930);
  assert.equal(buy.accounts[1].basis, 500070);
  assert.equal(buy.result.price, 50000);
  assert.equal(initial[1].orders.length, 0);
  assert.deepEqual(buy.accounts[0], initial[0]);
  const sell = executePracticeOrder(buy.accounts, { ...request, quantity: 5, order_type: '매도' });
  assert.equal(sell.accounts[1].quantity, 5);
  assert.equal(sell.accounts[1].withdrawable_cash, 749400);
  assert.equal(sell.accounts[1].basis, 250035);
  assert.equal(sell.result.realized_pnl, -565);
  assert.throws(() => executePracticeOrder(sell.accounts, { ...request, quantity: 6, order_type: '매도' }));
  assert.throws(() => executePracticeOrder(initial, { ...request, quantity: 20 }));
  assert.throws(() => executePracticeOrder(initial, { ...request, account_id: 1 }));
  const all = executePracticeOrder(sell.accounts, { ...request, quantity: 5, order_type: '매도' });
  assert.equal(all.accounts[1].basis, 0);
  assert.equal(all.accounts[1].quantity, 0);
});

test('portfolio acquisition cost includes charged buy fees and supports historical basis', () => {
  const holding = { hold_quantity: 5, avg_price: 50000, acquisition_cost: 250035, quote: { current_price: 50000 } };
  assert.equal(holdingCost(holding), 250035);
  assert.deepEqual(portfolioTotals({ withdrawable_cash: 749400, holdings: [holding] }), { cash: 749400, cost: 250035, market: 250000, unrealized: -35, total: 999400 });
  assert.equal(holdingCost({ hold_quantity: 2, avg_price: 30 }), 60);
});
