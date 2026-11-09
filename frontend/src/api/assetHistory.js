import api from './client';
import { koreaDate, parseAssetRange, parseAssetWeek } from '../utils/assetCharts';

export async function fetchAssetRange(accountId, start, end, signal) {
  let saveFailed = false;
  if (end === koreaDate()) {
    try { await api.post('/trading/portfolio/history/snapshot', null, { params: { account_id: accountId }, signal, cache: false }); }
    catch (error) {
      if (signal?.aborted || [401, 403, 404].includes(error.response?.status)) throw error;
      saveFailed = true;
    }
  }
  const { data } = await api.get('/trading/portfolio/history/range', { params: { account_id: accountId, start_date: start, end_date: end }, signal, cache: false });
  const result = parseAssetRange(data, accountId);
  if (data.start_date !== start || data.end_date !== end) throw new Error('조회 기간이 일치하지 않습니다.');
  return { ...result, saveFailed };
}

export async function fetchAssetWeek(accountId, weekOffset, signal) {
  const config = { params: { account_id: accountId, week_offset: weekOffset }, signal, cache: false };
  let saveFailed = false;
  if (weekOffset === 0) {
    try {
      const response = await api.post('/trading/portfolio/history/snapshot', null, config);
      return parseAssetWeek(response.data, accountId);
    } catch (error) {
      if (signal?.aborted || [401, 403, 404].includes(error.response?.status)) throw error;
      saveFailed = true;
    }
  }
  const response = await api.get('/trading/portfolio/history', config);
  return { ...parseAssetWeek(response.data, accountId), saveFailed };
}
