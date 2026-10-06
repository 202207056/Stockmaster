export const ORDER_TYPES = ['지정가', '시장가', '중간가', '최유리지정가', '최우선지정가'];
export const ORDER_TYPE_HELP = {
  지정가: '가격을 직접 정합니다. 매수는 그 가격 이하, 매도는 그 가격 이상에서만 거래합니다. 접수되어도 체결되지 않을 수 있습니다.',
  시장가: '',
  중간가: '가장 높은 매수호가와 가장 낮은 매도호가의 중간 가격입니다. 두 호가가 바뀌면 주문 가격도 바뀝니다. 체결을 보장하지 않습니다.',
  최유리지정가: '접수 시 상대편의 가장 좋은 호가로 가격을 정합니다. 매수는 매도 1호가, 매도는 매수 1호가입니다. 정해진 가격을 계속 따라 바꾸지는 않습니다.',
  최우선지정가: '접수 시 내 쪽의 가장 좋은 호가로 가격을 정합니다. 매수는 매수 1호가, 매도는 매도 1호가입니다. 같은 가격의 기존 주문보다 먼저 체결되는 것은 아닙니다.',
};
export const needsBook = type => ['중간가', '최유리지정가', '최우선지정가'].includes(type);
export function resolveOrderPrice(type, side, limit, current, book) {
  const valid = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  if (type === '지정가') return valid(limit);
  if (type === '시장가') return valid(current);
  const bid = valid(book?.bid), ask = valid(book?.ask);
  if (!bid || !ask || bid > ask) return null;
  if (type === '중간가') return Math.floor((bid + ask) / 2);
  if (type === '최유리지정가') return side === '매수' ? ask : bid;
  if (type === '최우선지정가') return side === '매수' ? bid : ask;
  return null;
}

// Browser-only progress marker: contains no account, balance or order information.
export const BUY_TUTORIAL_KEY = 'stockmaster:buy-tutorial:v2:completed';
const completedInMemory = new Set();
export function buyTutorialKey(userId) {
  if (userId == null) return BUY_TUTORIAL_KEY;
  let hash = 14695981039346656037n;
  for (const char of String(userId)) hash = BigInt.asUintN(64, (hash ^ BigInt(char.codePointAt(0))) * 1099511628211n);
  return `${BUY_TUTORIAL_KEY}:${hash.toString(16)}`;
}
export function hasCompletedBuyTutorial(key = BUY_TUTORIAL_KEY) {
  try { return completedInMemory.has(key) || localStorage.getItem(key) === 'true'; }
  catch { return completedInMemory.has(key); }
}
export function completeBuyTutorial(key = BUY_TUTORIAL_KEY) {
  completedInMemory.add(key);
  try { localStorage.setItem(key, 'true'); } catch { /* works for this session */ }
}
