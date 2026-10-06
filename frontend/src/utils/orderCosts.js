// Mock rates from backend/app/services/order_service.py (2026-10-03).
export function estimateOrderCosts(side, price, quantity) {
  if (!Number.isSafeInteger(Number(price)) || Number(price) <= 0 || !Number.isSafeInteger(Number(quantity)) || Number(quantity) <= 0) return null;
  const gross = Number(price) * Number(quantity);
  if (!['매수', '매도'].includes(side) || !Number.isSafeInteger(gross) || gross <= 0) return null;
  // Integer arithmetic matches Decimal ROUND_HALF_UP, including half-won ties.
  const amount = BigInt(gross);
  const commission = Number((amount * 15n + 50000n) / 100000n);
  const tax = side === '매도' ? Number((amount * 18n + 5000n) / 10000n) : 0;
  const settlement = side === '매수' ? gross + commission : gross - commission - tax;
  return Number.isSafeInteger(settlement) ? { gross, commission, tax, settlement } : null;
}
