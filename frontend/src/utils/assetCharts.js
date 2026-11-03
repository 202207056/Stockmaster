import { numberOrNull, quotePrice, requireArray, requireObject } from '../api/normalize.js';

export function portfolioSlices(holdings) {
  const values = new Map();
  for (const holding of holdings) {
    const quantity = numberOrNull(holding.hold_quantity);
    if (quantity === 0) continue;
    const price = quotePrice(holding.quote);
    if (quantity === null || quantity < 0 || price === null) return null;
    const code = holding.symbol_code;
    const previous = values.get(code);
    values.set(code, { code, name: holding.security_name || code, value: (previous?.value || 0) + quantity * price });
  }
  return [...values.values()].sort((a, b) => b.value - a.value);
}

export function parseAssetWeek(source, accountId) {
  const data = requireObject(source);
  const start = Date.parse(`${data.week_start}T00:00:00Z`);
  const end = Date.parse(`${data.week_end}T00:00:00Z`);
  if (data.account_id !== Number(accountId) || !Number.isFinite(start) || end - start !== 6 * 86400000 || data.timezone !== 'Asia/Seoul') throw new Error('자산 이력의 계좌와 기간을 확인할 수 없습니다.');
  const dates = new Set();
  const rows = requireArray(data.rows).map(row => {
    const time = Date.parse(`${row.date}T00:00:00Z`);
    const value = numberOrNull(row.total);
    if (!Number.isFinite(time) || time < start || time > end || value === null || dates.has(row.date)) throw new Error('자산 이력 값을 확인할 수 없습니다.');
    dates.add(row.date);
    return { time, value, isDemo: row.is_demo === true };
  }).sort((a, b) => a.time - b.time);
  return { start, end, rows };
}

