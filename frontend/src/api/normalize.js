export function requireArray(value) {
  if (!Array.isArray(value)) throw new Error('서버 목록 응답 형식을 확인해 주세요.');
  return value;
}

export function requireObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('서버 응답 형식을 확인해 주세요.');
  return value;
}

export function numberOrNull(value) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function quotePrice(quote) {
  const value = numberOrNull(quote?.current_price);
  return value !== null && value > 0 ? value : null;
}

export function chartRows(value) {
  const byDate = new Map();
  for (const row of requireArray(value)) {
    const raw = String(row.date ?? '').replaceAll('-', '');
    if (!/^\d{8}$/.test(raw)) continue;
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) continue;
    const [open, high, low, close] = ['open', 'high', 'low', 'close'].map((key) => numberOrNull(row[key]));
    if ([open, high, low, close].some((n) => n === null || n <= 0)) continue;
    if (low > Math.min(open, close) || high < Math.max(open, close) || low > high) continue;
    byDate.set(date, { date, open, high, low, close, volume: numberOrNull(row.volume) });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function portfolioTotals(portfolio) {
  if (!portfolio) return null;
  const cash = numberOrNull(portfolio.withdrawable_cash);
  let cost = 0;
  let market = 0;
  let costComplete = true;
  let priceComplete = true;
  for (const holding of portfolio.holdings) {
    const quantity = numberOrNull(holding.hold_quantity);
    const average = numberOrNull(holding.avg_price);
    const price = quotePrice(holding.quote);
    if (quantity === null || quantity < 0 || average === null || average < 0) costComplete = false;
    else cost += quantity * average;
    if (price === null || quantity === null || quantity < 0) priceComplete = false;
    else market += quantity * price;
  }
  return {
    cash, cost: costComplete ? cost : null, market: priceComplete ? market : null,
    unrealized: costComplete && priceComplete ? market - cost : null,
    total: cash !== null && priceComplete ? cash + market : null,
  };
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
