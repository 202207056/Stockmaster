import api, { getToken, toUserMessage } from './client';
import { chartRows, quotePrice, requireArray, requireObject } from './normalize';
import { abortableDelay, createSharedRequest } from './sharedRequest';

const get = async (path, params, signal) => (await api.get(path, { params, signal })).data;
export const fetchStocks = async (search, signal) => requireArray(await get('/stocks', { search: search || undefined }, signal));
export const fetchStock = async (code, signal) => requireObject(await get(`/stocks/${encodeURIComponent(code)}`, undefined, signal));
export const fetchStockLogo = async (code, signal) => requireObject(await get(`/stocks/${encodeURIComponent(code)}/logo`, undefined, signal));
export const fetchPrice = async (code, signal) => requireObject(await get(`/stocks/${encodeURIComponent(code)}/price`, undefined, signal));
export const fetchChart = async (code, signal, period = 'D') => chartRows(await get(`/stocks/${encodeURIComponent(code)}/chart`, { period }, signal));
export const fetchRanking = async (type, signal) => requireArray(await get(`/stocks/ranking/${type}`, { limit: 10 }, signal));
export const fetchNews = async (signal) => {
  // Optional local news preview; production uses the shared backend by default.
  const newsBaseURL = import.meta.env.DEV
    ? import.meta.env.VITE_NEWS_API_BASE_URL?.replace(/\/+$/, '') : undefined;
  const response = await api.get('/news/market', {
    params: { limit: 8 },
    signal,
    ...(newsBaseURL ? { baseURL: newsBaseURL } : {}),
  });
  return requireArray(response.data);
};
export const fetchMarketIndices = async (signal) => requireArray(await get('/market/indices', undefined, signal));
export const fetchCoach = async (symbol, signal) => requireObject(await get('/ai/coach', { symbol }, signal));
export const fetchNewsSummary = async (code, signal) => requireObject(await get(`/ai/news-summary/${encodeURIComponent(code)}`, undefined, signal));
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
export const cancelOrder = async (orderId) => (await api.put(`/trading/orders/${encodeURIComponent(orderId)}/cancel`)).data;
export const fetchAutomationCapabilities = async (signal) => requireObject(await get('/trading/automations/capabilities', undefined, signal));
export const fetchAutomations = async (accountId, signal) => requireArray(await get('/trading/automations', { account_id: accountId }, signal));
export const createAutomation = async (payload) => requireObject((await api.post('/trading/automations', payload)).data);
export const cancelAutomation = async (id) => requireObject((await api.put(`/trading/automations/${encodeURIComponent(id)}/cancel`)).data);
export const fetchPortfolio = async (accountId, signal) => {
  const data = requireObject(await get('/trading/portfolio', { account_id: accountId }, signal));
  return { ...data, holdings: requireArray(data.holdings) };
};
export const fetchSurvey = async (signal) => requireArray(await get('/ai/survey', undefined, signal));
export const saveSurvey = async (answers) => {
  const data = requireObject((await api.post('/ai/survey', { answers })).data);
  requireObject(data.analysis);
  if (typeof data.investment_style !== 'string' || !data.investment_style.trim()) throw new Error('서버의 투자성향 분석 결과를 확인할 수 없습니다.');
  return data;
};

// Fetch sequentially: one request per holding, no burst polling against the upstream provider.
async function loadValuedPortfolio(signal, accountId) {
  const portfolio = await fetchPortfolio(accountId, signal);
  const holdings = [];
  for (const holding of portfolio.holdings) {
    try {
      const quote = await fetchPortfolioPrice(holding.symbol_code, signal);
      holdings.push({ ...holding, quote });
    } catch (error) {
      if (signal?.aborted || error.response?.status === 401) throw error;
      holdings.push({ ...holding, quote: null, quoteError: toUserMessage(error) });
    }
  }
  return { ...portfolio, holdings, fetchedAt: new Date().toISOString() };
}

async function fetchPortfolioPrice(code, signal) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const quote = await fetchPrice(code, signal);
      if (quotePrice(quote) === null) throw new Error(quote.message || '유효한 현재가를 받지 못했습니다.');
      return quote;
    } catch (error) {
      const status = error.response?.status;
      if (signal?.aborted || attempt === 1 || (status && status !== 429 && status < 500)) throw error;
      await abortableDelay(1000, signal);
    }
  }
}

const sharedPortfolio = createSharedRequest(loadValuedPortfolio);
export function fetchValuedPortfolio(accountId, signal) {
  // No completed data is cached; neither sessions nor accounts share private data.
  return sharedPortfolio(JSON.stringify([getToken(), accountId]), signal, accountId);
}

export const fetchOrderBook = async (code, signal) => requireObject(await get(`/trading/orders/book/${encodeURIComponent(code)}`, undefined, signal));
export const checkPendingOrder = async id => requireObject((await api.post(`/trading/orders/${encodeURIComponent(id)}/check`)).data);

export const fetchMisu = async (accountId, signal) => requireObject(await get(`/trading/misu/${encodeURIComponent(accountId)}`, undefined, signal));
export const repayMisu = async (accountId, payload) => requireObject((await api.post(`/trading/misu/${encodeURIComponent(accountId)}/repay`, payload)).data);
export const settleMisu = async accountId => requireObject((await api.post(`/trading/misu/${encodeURIComponent(accountId)}/settle`)).data);
