import { numberOrNull } from '../api/normalize.js';

function minutes(time) {
  if (!/^(?:[01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]$/.test(time)) return null;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(2, 4)) + Number(time.slice(4)) / 60;
}

/** Use each market's local session, defaulting to KRX for existing KIS data. */
export function marketChartPoints(intraday) {
  const start = minutes(String(intraday?.session_start ?? '090000'));
  const end = minutes(String(intraday?.session_end ?? '153000'));
  if (start === null || end === null || end <= start) return [];
  const unique = new Map();
  for (const point of Array.isArray(intraday?.points) ? intraday.points : []) {
    const time = String(point?.time ?? '');
    const value = numberOrNull(point?.value);
    const minute = minutes(time);
    if (minute === null || minute < start || minute > end || value === null || value <= 0) continue;
    unique.set(minute, { minute, value });
  }
  const points = [...unique.values()].sort((a, b) => a.minute - b.minute);
  if (points.length < 2) return [];
  const low = Math.min(...points.map((point) => point.value));
  const high = Math.max(...points.map((point) => point.value));
  return points.map(({ minute, value }) => ({
    x: 8 + ((minute - start) / (end - start)) * 80,
    y: high === low ? 48 : 80 - ((value - low) / (high - low)) * 64,
  }));
}
