import { estimateOrderCosts } from './orderCosts';

// Site simulation rule, not a brokerage/product-specific margin rate.
export function estimateMisu(price, quantity, cash) {
  const costs = estimateOrderCosts('매수', price, quantity);
  if (!costs || !Number.isFinite(cash) || cash < 0) return null;
  return { ...costs, required: Math.ceil(costs.gross * 0.5) + costs.commission,
    shortfall: Math.max(0, costs.settlement - cash), paid: Math.min(cash, costs.settlement) };
}

export const misuDate = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '주문 체결 후 확정';
