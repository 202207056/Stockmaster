
export const PRACTICE_STOCK = { symbol_code: '990001', name: '예시전자' };
export const PRACTICE_PRICE = 50000;
export function createPracticeAccounts(seeded = false) {
  const initialAmount = PRACTICE_PRICE * 10;
  return [
    { account_id: 1, account_name: '기본 예시 계좌', account_number: 'DEMO-0001', withdrawable_cash: 500000, quantity: 0, basis: 0, orders: [] },
    { account_id: 2, account_name: '매매 연습 계좌', account_number: 'DEMO-0002', withdrawable_cash: seeded ? 1000000 - initialAmount : 1000000, quantity: seeded ? 10 : 0, basis: seeded ? initialAmount : 0, orders: [] },
  ];
}

// Pure transaction used only by the local tutorial session. No API/storage access.
export function executePracticeOrder(accounts, request) {
  const account = accounts.find(item => item.account_id === request.account_id);
  if (!account || account.account_id !== 2) throw new Error('매매 연습 계좌를 선택해 주세요.');
  if (request.symbol_code !== PRACTICE_STOCK.symbol_code) throw new Error('연습 종목을 확인해 주세요.');
  const quantity = Number(request.quantity);
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 1000000) throw new Error('주문 수량을 확인해 주세요.');
  if (!['매수', '매도'].includes(request.order_type)) throw new Error('주문 구분을 확인해 주세요.');
  const amount = PRACTICE_PRICE * quantity;
  const cashDelta = request.order_type === '매수' ? -amount : amount;
  const buying = request.order_type === '매수';
  if (buying && account.withdrawable_cash + cashDelta < 0) throw new Error('매수 가능 현금이 부족합니다.');
  if (!buying && quantity > account.quantity) throw new Error(`보유한 ${account.quantity}주 안에서 매도 수량을 입력해 주세요.`);
  const allocated = buying ? 0 : quantity === account.quantity ? account.basis : Math.round(account.basis * quantity / account.quantity * 1e6) / 1e6;
  const result = { order_id: account.orders.length + 1, symbol_code: request.symbol_code, order_type: request.order_type, quantity, price: PRACTICE_PRICE, status: '체결' };
  const updated = { ...account, withdrawable_cash: account.withdrawable_cash + cashDelta, quantity: account.quantity + (buying ? quantity : -quantity), basis: buying ? account.basis - cashDelta : account.basis - allocated, orders: [...account.orders, result] };
  return { accounts: accounts.map(item => item === account ? updated : item), result };
}
