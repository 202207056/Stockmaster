import test from 'node:test';
import assert from 'node:assert/strict';
import { consensusLabel, brokerRatingLabel } from '../src/utils/stockRatings.js';

test('provider score anchors map to grades without rounding fractional averages', () => {
  assert.equal(consensusLabel(4), 'BUY · 매수');
  assert.equal(consensusLabel(2), 'SELL · 매도');
  assert.equal(consensusLabel(3), 'HOLD · 중립');
  assert.equal(consensusLabel(3.87), 'HOLD ~ BUY');
  for (const value of [null, undefined, 0, 6, NaN, '4']) assert.equal(consensusLabel(value), '—');
});
test('unrated and broker-specific opinion wording is not guessed', () => {
  assert.equal(brokerRatingLabel('매수'), 'BUY · 매수');
  assert.equal(brokerRatingLabel('매도'), 'SELL · 매도');
  assert.equal(brokerRatingLabel('Not Rated'), 'Not Rated');
  assert.equal(brokerRatingLabel('Trading Buy'), 'Trading Buy');
});
