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
  return parseAssetHistory(source, accountId, false);
}
export function parseAssetRange(source, accountId) {
  return parseAssetHistory(source, accountId, true);
}
function parseAssetHistory(source, accountId, range) {
  const data = requireObject(source);
  const start = assetDateTime(range ? data.start_date : data.week_start);
  const end = assetDateTime(range ? data.end_date : data.week_end);
  if (data.account_id !== Number(accountId) || start === null || end === null || end < start || (!range && end - start !== 6 * 86400000) || data.timezone !== 'Asia/Seoul') throw new Error('자산 이력의 계좌와 기간을 확인할 수 없습니다.');
  const dates = new Set();
  const rows = requireArray(data.rows).map(row => {
    const time = Date.parse(`${row.date}T00:00:00Z`);
    const value = numberOrNull(row.total);
    if (!Number.isFinite(time) || time < start || time > end || value === null || dates.has(row.date)) throw new Error('자산 이력 값을 확인할 수 없습니다.');
    dates.add(row.date);
    return { time, value, isDemo: row.is_demo === true };
  }).sort((a, b) => a.time - b.time);
  let previous = null;
  if (data.previous != null) {
    const time = assetDateTime(data.previous.date);
    const value = numberOrNull(data.previous.total);
    if (time === null || time >= start || value === null || data.previous.is_demo === true) throw new Error('이전 자산 기록을 확인할 수 없습니다.');
    previous = { time, value, isDemo: false };
  }
  return { start, end, rows, previous };
}


const DAY = 86400000;
export function assetDayChange(points, point, previous = null) {
  if (!point || point.isDemo) return null;
  const prior = [...points, ...(previous ? [previous] : [])].find(row => row.time === point.time - DAY && !row.isDemo);
  if (!prior || !Number.isFinite(prior.value) || prior.value <= 0) return null;
  return (point.value - prior.value) / prior.value * 100;
}
export function koreaDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
export function assetDateTime(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? time : null;
}
export function assetWeekStart(date) {
  const time = assetDateTime(date);
  return time === null ? null : time - (new Date(time).getUTCDay() + 6) % 7 * DAY;
}
export function assetWeekOffset(date, today = koreaDate()) {
  const start = assetWeekStart(date), current = assetWeekStart(today);
  if (start === null || current === null || date > today) return null;
  const offset = (current - start) / (7 * DAY);
  return offset >= 0 && offset <= 520 ? offset : null;
}
export function assetComparison(rows, date, current, prior = null) {
  const time = assetDateTime(date);
  if (time === null) return null;
  const baseline = [...(rows || []), ...(prior ? [prior] : [])]
    .filter(row => row.time <= time && !row.isDemo)
    .sort((a, b) => b.time - a.time)[0];
  if (!baseline || !Number.isFinite(current)) return null;
  // Match the whole-won values shown to the user, including rounding at .5 won.
  const previous = Math.round(baseline.value), latest = Math.round(current);
  return { previous, current: latest, difference: latest - previous, date: new Date(baseline.time).toISOString().slice(0, 10) };
}
