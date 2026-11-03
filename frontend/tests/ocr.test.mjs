import test from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY } from '../src/constants/glossary.js';
import { findDetectedTerms, findUnknownTerms, isAnalyzerRoute, validateFile, validateDimensions } from '../src/features/ocr/terms.js';

test('OCR discovers investment acronyms, Korean terms and particles using existing glossary IDs', () => {
  const found = findDetectedTerms('PER 12배 PBR 0.8배 ROE 12% EPS 4500원\n시가총액 450조원 거래량은 100주 평가손익 예수금 변동성이 높습니다.', GLOSSARY);
  for (const id of ['per', 'pbr', 'roe', 'eps', 'market_cap', 'volume', 'eval_pnl', 'deposit', 'volatility']) {
    assert.ok(found.includes(id), `expected glossary id ${id}`);
  }
});
test('OCR avoids arbitrary id matches, embedded English words and Korean compound substrings', () => {
  const found = findDetectedTerms('SUPER ROEX PBRIDGE cooperate 현재가격 주식회사 시가총액 주주총회', GLOSSARY);
  for (const id of ['per', 'roe', 'pbr', 'current_price', 'stock', 'open_price', 'shareholder']) assert.ok(!found.includes(id), id);
  assert.ok(found.includes('market_cap'));
  assert.ok(findDetectedTerms('ｐｅｒ 12 ＰＢＲ 0.8 자기자본이익률은 5%', GLOSSARY).includes('roe'));
});
test('ETF has its own definition instead of borrowing the fee definition', () => {
  assert.deepEqual(findUnknownTerms('ETF PER', GLOSSARY), []);
  assert.ok(findDetectedTerms('ETF', GLOSSARY).includes('etf'));
  assert.deepEqual(findUnknownTerms('ETF', {}), ['ETF']);
  assert.ok(!findDetectedTerms('ETF', GLOSSARY).includes('fee'));
});
test('analyzer is hidden on onboarding, authentication, tutorials and unknown routes', () => {
  for (const route of ['/trading', '/assets', '/dashboard', '/learn', '/mypage']) assert.equal(isAnalyzerRoute(route), true);
  for (const route of ['/', '/login', '/signup', '/survey', '/seed-money', '/learn/tutorial/buy', '/learn/trading-tutorial', '/not-found']) assert.equal(isAnalyzerRoute(route), false);
  assert.equal(isAnalyzerRoute('/trading', '?practice=buy'), false);
  assert.equal(isAnalyzerRoute('/dashboard', '?tour=0'), false);
});
test('OCR input rejects empty, unsupported, oversized files and excessive pixel counts', () => {
  assert.equal(validateFile({ type: 'image/jpeg', size: 500 }), null);
  for (const file of [{ type: 'image/png', size: 0 }, { type: 'image/svg+xml', size: 20 }, { type: 'image/png', size: 10 * 1024 * 1024 + 1 }]) assert.ok(validateFile(file));
  assert.equal(validateDimensions(4000, 4000), null);
  assert.ok(validateDimensions(4001, 4000));
});
