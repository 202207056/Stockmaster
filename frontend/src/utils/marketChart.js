import { numberOrNull } from '../api/normalize.js';

/** Keep only real intraday points; x spans the full 09:00–15:30 session. */
export function marketChartPoints(intraday) {
  const unique = new Map();
  for (const point of Array.isArray(intraday?.points) ? intraday.points : []) {
    const time = String(point?.time ?? '');
    const value = numberOrNull(point?.value);
    if (!/^(09|1[0-5])[0-5][0-9][0-5][0-9]$/.test(time) || time > '153000' || value === null || value <= 0) continue;
    const minute = Number(time.slice(0, 2)) * 60 + Number(time.slice(2, 4)) + Number(time.slice(4)) / 60;
    unique.set(minute, { minute, value });
  }
  const points = [...unique.values()].sort((a, b) => a.minute - b.minute);
  if (points.length < 2) return [];
  const low = Math.min(...points.map((point) => point.value));
  const high = Math.max(...points.map((point) => point.value));
  return points.map(({ minute, value }) => ({
    x: 8 + ((minute - 540) / 390) * 80,
    y: high === low ? 48 : 80 - ((value - low) / (high - low)) * 64,
  }));
}
