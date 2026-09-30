import policy from '../constants/tradingPolicy.json' with { type: 'json' };

export const TRADING_POLICY = policy;
export function calculateCosts(price, quantity, side, market, rules = policy) {
  if (!Number.isSafeInteger(price) || price <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(price * quantity)) throw new Error('가격·수량은 양의 정수여야 합니다.');
  if (!['매수', '매도'].includes(side) || !rules.markets[market]) throw new Error('지원하는 시장·매매 구분을 확인하세요.');
  const gross = price * quantity;
  // Integer arithmetic avoids rounding a fee just below an exact won boundary.
  const floorRate = (ppm, unit) => Number(BigInt(gross) * BigInt(ppm) / (1000000n * BigInt(unit)) * BigInt(unit));
  const commission = floorRate(rules.commission_ppm, rules.commission_unit);
  const transaction_tax = side === '매도' ? floorRate(rules.markets[market].transaction_tax_ppm, rules.tax_unit) : 0;
  const rural_tax = side === '매도' ? floorRate(rules.markets[market].rural_tax_ppm, rules.tax_unit) : 0;
  const total_cost = commission + transaction_tax + rural_tax;
  const cash_delta = side === '매수' ? -(gross + total_cost) : gross - total_cost;
  if (!Number.isSafeInteger(cash_delta)) throw new Error('금액이 허용 범위를 넘었습니다.');
  return { gross, commission, transaction_tax, rural_tax, total_cost, cash_delta, tax_market: market, cost_policy_version: rules.version };
}

export function tryCosts(price, quantity, side, market, rules = policy) {
  try { return calculateCosts(price, quantity, side, market, rules); } catch { return null; }
}
