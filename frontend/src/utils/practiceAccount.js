import { calculateCosts, TRADING_POLICY } from './tradingCosts.js';

export const PRACTICE_STOCK = { symbol_code: '990001', name: '예시전자' };
export const PRACTICE_PRICE = 50000;
export function createPracticeAccounts(seeded = false) {
  const initialBuy = calculateCosts(PRACTICE_PRICE, 10, '매수', 'KOSPI');
  return [
    { account_id: 1, account_name: '기본 예시 계좌', account_number: 'DEMO-0001', withdrawable_cash: 500000, quantity: 0, basis: 0, orders: [] },
    { account_id: 2, account_name: '매매 연습 계좌', account_number: 'DEMO-0002', withdrawable_cash: seeded ? 1000000 + initialBuy.cash_delta : 1000000, quantity: seeded ? 10 : 0, basis: seeded ? -initialBuy.cash_delta : 0, orders: [] },
  ];
}

// Pure transaction used only by the local tutorial session. No API/storage access.
export function executePracticeOrder(accounts, request) {
  const account = accounts.find(item => item.account_id === request.account_id);
  if (!account || account.account_id !== 2) throw new Error('매매 연습 계좌를 선택해 주세요.');
  if (request.symbol_code !== PRACTICE_STOCK.symbol_code || request.cost_policy_version !== TRADING_POLICY.version) throw new Error('연습 종목과 비용 기준을 확인해 주세요.');
  const quantity = Number(request.quantity);
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 1000000) throw new Error('주문 수량을 확인해 주세요.');
  const costs = calculateCosts(PRACTICE_PRICE, quantity, request.order_type, 'KOSPI');
  const buying = request.order_type === '매수';
  if (buying && account.withdrawable_cash + costs.cash_delta < 0) throw new Error('수수료를 포함한 매수 가능 현금이 부족합니다.');
  if (!buying && quantity > account.quantity) throw new Error(`보유한 ${account.quantity}주 안에서 매도 수량을 입력해 주세요.`);
  const allocated = buying ? 0 : quantity === account.quantity ? account.basis : Math.round(account.basis * quantity / account.quantity * 1e6) / 1e6;
  const result = { order_id: account.orders.length + 1, symbol_code: request.symbol_code, order_type: request.order_type, quantity, price: PRACTICE_PRICE, status: '체결', ...costs, realized_pnl: buying ? null : costs.cash_delta - allocated };
  const updated = { ...account, withdrawable_cash: account.withdrawable_cash + costs.cash_delta, quantity: account.quantity + (buying ? quantity : -quantity), basis: buying ? account.basis - costs.cash_delta : account.basis - allocated, orders: [...account.orders, result] };
  return { accounts: accounts.map(item => item === account ? updated : item), result };
}
