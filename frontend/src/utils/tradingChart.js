// Ranges end at the latest supplied trading date, including on market holidays.
export function chartRangeRows(rows = [], range = 'D') {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  if (range === 'D') return sorted.slice(-1);
  const start = new Date(`${sorted.at(-1).date}T00:00:00Z`);
  if (range === 'W') start.setUTCDate(start.getUTCDate() - 7);
  else {
    const day = start.getUTCDate();
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - (range === 'M' ? 3 : 12));
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, lastDay));
  }
  const cutoff = start.toISOString().slice(0, 10);
  return sorted.filter((row) => row.date > cutoff);
}

export function chartHoverIndex(x, count) {
  return Math.max(0, Math.min(count - 1, Math.floor((x - 20) / (580 / count))));
}
