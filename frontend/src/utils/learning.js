/** Educational models only. No market, account or order API calls. */
export function compareAllocation(weight, change, capital = 1_000_000) {
  if (![weight, change, capital].every(Number.isFinite) || weight < 0 || weight > 100 || change < -100 || capital < 0) return null;
  const stock = capital * weight / 100;
  const delta = Math.round(stock * change / 100) || 0;
  return { stock, cash: capital - stock, delta, total: capital + delta, rate: weight * change / 100 || 0 };
}

export function partialSale(quantity, price = 9_000) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 30 || !Number.isFinite(price) || price < 0) return null;
  const remaining = 30 - quantity;
  return { cash: 700_000 + quantity * price, remaining, market: remaining * price, total: 700_000 + 30 * price, realized: (price - 10_000) * quantity || 0, unrealized: (price - 10_000) * remaining || 0 };
}

export function learningScope(userId, accountId) {
  if (userId == null) return 'guest';
  return accountId == null ? `user:${encodeURIComponent(userId)}` : `user:${encodeURIComponent(userId)}:account:${encodeURIComponent(accountId)}`;
}

export function safeRecord(value, defaults) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const field = value[key];
    if (Array.isArray(fallback)) return [key, Array.isArray(field) ? field.filter((item) => item && typeof item === 'object' && !Array.isArray(item)).slice(-50) : fallback];
    if (typeof field !== typeof fallback || (typeof field === 'number' && !Number.isFinite(field))) return [key, fallback];
    return [key, typeof field === 'string' ? field.slice(0, 2000) : field];
  }));
}

export function recordAnswer(previous, selected, correctIndex) {
  return { selected, answered: true, correct: selected === correctIndex, firstCorrect: previous.answered ? previous.firstCorrect : selected === correctIndex, attempts: previous.attempts + 1 };
}

export const EMPTY_ANSWER = { selected: -1, answered: false, correct: false, firstCorrect: false, attempts: 0 };
