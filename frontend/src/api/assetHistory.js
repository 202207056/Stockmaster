import api from './client';
import { parseAssetWeek } from '../utils/assetCharts';

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
