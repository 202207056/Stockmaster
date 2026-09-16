import api from './client';
import { chartRows, requireArray, requireObject } from './normalize';
import { chartRangeRows } from '../utils/tradingChart';

function legacyChart(data, range) {
  const rows = chartRows(data);
  // Keep a useful line while intraday history is unavailable, and label the actual range.
  return {
    rows: range === 'D' ? rows : chartRangeRows(rows, range),
    range,
    resolution: { D: '1d', W: '1d', M: '1w', Y: '1mo' }[range],
    displayLabel: range === 'D' ? `최근 ${rows.length}거래일` : null,
    notice: range === 'D'
      ? '장중 차트를 아직 이용할 수 없어 최근 거래일의 일별 가격을 표시합니다.'
      : '상세 차트를 아직 이용할 수 없어 제공되는 일·주·월별 가격을 표시합니다.',
  };
}

// Separate adapter: keep existing daily-chart consumers unchanged.
export async function fetchChartHistory(code, range, signal) {
  const period = { D: 'D', W: 'D', M: 'W', Y: 'M' }[range];
  const response = await api.get(`/stocks/${encodeURIComponent(code)}/chart`, { params: { range, period }, signal });
  // Older deployments ignore range and return the original period-based array.
  if (Array.isArray(response.data)) return legacyChart(response.data, range);
  const payload = requireObject(response.data);
  if (payload.range !== range || !['1m', '5m', '1d'].includes(payload.resolution)) throw new Error('차트 기간 정보를 확인할 수 없습니다.');
  const byTime = new Map();
  for (const source of requireArray(payload.rows)) {
    if (!source || typeof source !== 'object') continue;
    const row = chartRows([source])[0];
    if (!row) continue;
    if (payload.resolution !== '1d') {
      const time = String(source.time ?? '');
      if (!/^(09|1[0-5]):[0-5]\d:[0-5]\d$/.test(time) || time > '15:30:00') continue;
      row.time = time;
    }
    row.key = `${row.date}${row.time ? `T${row.time}` : ''}`;
    row.label = `${row.date}${row.time ? ` ${row.time.slice(0, 5)}` : ''}`;
    byTime.set(row.key, row);
  }
  return {
    ...payload,
    notice: typeof payload.notice === 'string' ? payload.notice : null,
    rows: [...byTime.values()].sort((a, b) => a.key.localeCompare(b.key)),
  };
}
