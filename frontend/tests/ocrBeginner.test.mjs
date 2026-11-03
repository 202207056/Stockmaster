import test from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, CATEGORIES, searchGlossary } from '../src/constants/glossary.js';
import { findDetectedTerms } from '../src/components/ai/term-analyzer/terms.js';

const basics = {
  트레이딩: 'trading', Trading: 'trading', 차트: 'chart', 매수: 'buy', 매도: 'sell',
  주문: 'order', 체결: 'execution', 미체결: 'pending_order', 호가: 'order_book', 현재가: 'current_price',
  시가: 'open_price', 종가: 'close_price', 고가: 'high_low', 저가: 'high_low', 거래량: 'volume',
  거래대금: 'trading_value', 시가총액: 'market_cap', 수익률: 'return_rate', 손익: 'pnl',
  평가손익: 'eval_pnl', 실현손익: 'realized_pnl', 평균매수가: 'avg_price', 평단가: 'avg_price',
  예수금: 'deposit', 주문가능금액: 'orderable_cash', 증거금: 'margin', 지정가: 'limit_order',
  시장가: 'market_order', 손절: 'stop_loss', 익절: 'take_profit', 양봉: 'bullish_candle',
  음봉: 'bearish_candle', 상승: 'price_rise', 하락: 'price_fall', 변동성: 'volatility',
  분할매수: 'split_buy', 분할매도: 'split_sell', 배당금: 'dividend', PER: 'per', PBR: 'pbr',
  ROE: 'roe', EPS: 'eps', ETF: 'etf', IPO: 'ipo',
};

test('all 44 requested beginner spellings independently resolve to the shared definition', () => {
  assert.equal(Object.keys(basics).length, 44);
  for (const [text, id] of Object.entries(basics)) assert.deepEqual(findDetectedTerms(text, GLOSSARY), [id], text);
});

test('more than 20 terms are returned without truncation or duplicate synonym cards', () => {
  const expected = [...new Set(Object.values(basics))];
  const text = Object.keys(basics).join('\n');
  const detected = findDetectedTerms(text, GLOSSARY);
  assert.equal(detected.length, expected.length);
  assert.deepEqual(detected, expected);
});

test('long compound spans win; separately written short words still remain discoverable', () => {
  assert.deepEqual(findDetectedTerms('시가총액 평가 손익 실현손익 미체결 분할 매수 지정가 주문 호가 단위', GLOSSARY),
    ['market_cap', 'eval_pnl', 'realized_pnl', 'pending_order', 'split_buy', 'limit_order', 'tick_size']);
  assert.deepEqual(findDetectedTerms('캔들 차트\n차트\n시장가 주문\n주문\n매수\n분할매수', GLOSSARY),
    ['candle', 'chart', 'market_order', 'order', 'buy', 'split_buy']);
  assert.deepEqual(findDetectedTerms('평단가 평균매수가 평균단가 Trading 트레이딩 trading', GLOSSARY), ['avg_price', 'trading']);
});

test('known Korean spacing, particles, full width acronyms and adjacent table numbers are safe', () => {
  assert.deepEqual(findDetectedTerms('트 레 이 딩은\n평가 손익을\n시가 총액\n지 정 가\nＰＥＲ12.3 ＰＢＲ0.8\nTrading', GLOSSARY),
    ['trading', 'eval_pnl', 'market_cap', 'limit_order', 'per', 'pbr']);
  assert.deepEqual(findDetectedTerms('시가종액 R0E EP5', GLOSSARY), []);
});

test('ordinary words and embedded strings are not guessed as financial terms', () => {
  for (const text of ['SUPER PBRIDGE TradingView IPOWER ETFISH', '저가항공 고가도로 주문서', '커피 주문 결제 완료', '기온 상승 물가 하락', '조직 차트', '관심 주주총회', '최저 기온']) {
    assert.deepEqual(findDetectedTerms(text, GLOSSARY), [], text);
  }
  assert.deepEqual(findDetectedTerms('주식 주문 결제\n주가 상승 하락\n주식 차트', GLOSSARY),
    ['stock', 'order', 'settlement', 'current_price', 'price_rise', 'price_fall', 'chart']);
  assert.deepEqual(findDetectedTerms('52주 최저', GLOSSARY), ['week52']);
  assert.deepEqual(findDetectedTerms('미수금 미수거래', GLOSSARY), ['misu_debt', 'misu']);
});

test('new site vocabulary and glossary aliases remain searchable on the learning page', () => {
  for (const id of ['daily_candle', 'weekly_candle', 'monthly_candle', 'rsi', 'macd', 'misu', 'credit_financing', 'forced_sale', 'favorable_limit', 'priority_limit', 'midpoint', 'order_quantity', 'settlement']) {
    assert.ok(findDetectedTerms(GLOSSARY[id].term, GLOSSARY).includes(id), id);
  }
  for (const [alias, id] of [['Trading', 'trading'], ['평단가', 'avg_price'], ['손절', 'stop_loss'], ['상장지수펀드', 'etf']]) assert.ok(searchGlossary(alias).includes(id));
  for (const entry of Object.values(GLOSSARY)) {
    assert.ok(CATEGORIES[entry.category]); assert.ok(entry.desc); assert.ok(entry.example);
    for (const id of entry.related ?? []) assert.ok(GLOSSARY[id], id);
  }
});
