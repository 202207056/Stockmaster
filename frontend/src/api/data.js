import api from './client';
import { chartRows, requireArray, requireObject } from './normalize';

const get = async (path, params, signal) => (await api.get(path, { params, signal })).data;
export const fetchStocks = async (search, signal) => requireArray(await get('/stocks', { search: search || undefined }, signal));
export const fetchStock = async (code, signal) => requireObject(await get(`/stocks/${encodeURIComponent(code)}`, undefined, signal));
export const fetchPrice = async (code, signal) => requireObject(await get(`/stocks/${encodeURIComponent(code)}/price`, undefined, signal));
export const fetchChart = async (code, signal) => chartRows(await get(`/stocks/${encodeURIComponent(code)}/chart`, { period: 'D' }, signal));
export const fetchRanking = async (type, signal) => requireArray(await get(`/stocks/ranking/${type}`, { limit: 10 }, signal));
export const fetchNews = async (signal) => requireArray(await get('/news/market', { limit: 8 }, signal));
export const fetchPosts = async (page, signal, size = 20) => {
  const data = requireObject(await get('/community/posts', { page, size }, signal));
  return { ...data, items: requireArray(data.items) };
};
export const fetchPost = async (id, signal) => requireObject(await get(`/community/posts/${id}`, undefined, signal));
export const createPost = async (payload) => (await api.post('/community/posts', payload)).data;
export const createComment = async (id, content) => (await api.post(`/community/posts/${id}/comments`, { content })).data;
export const toggleLike = async (id) => (await api.post(`/community/posts/${id}/like`)).data;
export const fetchOrders = async (accountId, signal) => requireArray(await get('/trading/orders', { account_id: accountId }, signal));
export const submitOrder = async (payload) => (await api.post('/trading/orders', payload)).data;
export const fetchPortfolio = async (accountId, signal) => {
  const data = requireObject(await get('/trading/portfolio', { account_id: accountId }, signal));
  return { ...data, holdings: requireArray(data.holdings) };
};
export const fetchSurvey = async (signal) => requireArray(await get('/ai/survey', undefined, signal));
export const saveSurvey = async (answers) => (await api.post('/ai/survey', { answers })).data;

// Fetch sequentially: one request per holding, no burst polling against the upstream provider.
export async function fetchValuedPortfolio(accountId, signal) {
  const portfolio = await fetchPortfolio(accountId, signal);
  const holdings = [];
  for (const holding of portfolio.holdings) {
    try {
      holdings.push({ ...holding, quote: await fetchPrice(holding.symbol_code, signal) });
    } catch (error) {
      if (signal?.aborted || error.response?.status === 401) throw error;
      holdings.push({ ...holding, quote: null });
    }
  }
  return { ...portfolio, holdings, fetchedAt: new Date().toISOString() };
}
