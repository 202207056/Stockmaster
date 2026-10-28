import api, { getToken, toUserMessage } from './client';
import { chartRows, quotePrice, requireArray, requireObject } from './normalize';
import { abortableDelay, createSharedRequest } from './sharedRequest';

const get = async (path, params, signal) => (await api.get(path, { params, signal })).data;
export const fetchStocks = async (search, signal) => requireArray(await get('/stocks', { search: search || undefined }, signal));
export const fetchStock = async (code, signal) => requireObject(await get(`/stocks/${encodeURIComponent(code)}`, undefined, signal));
export const fetchStockLogo = async (code, signal) => requireObject(await get(`/stocks/${encodeURIComponent(code)}/logo`, undefined, signal));
export const fetchPrice = async (code, signal, options = {}) => requireObject((await api.get(`/stocks/${encodeURIComponent(code)}/price`, { signal, ...options })).data);
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
export const analyzeNews = async (articles, signal) => {
  const data = requireObject((await api.post('/ai/news-analysis', { articles }, { signal })).data);
  return requireArray(data.articles);
};
export const fetchCoach = async (symbol, signal) => requireObject(await get('/ai/coach', { symbol }, signal));
export const fetchNewsSummary = async (code, signal) => requireObject(await get(`/ai/news-summary/${encodeURIComponent(code)}`, undefined, signal));
export const fetchPortfolioBrief = async (accountId, code, signal, profile = 'luna') => {
  // A manual refresh must generate a new briefing, including within the GET cache TTL.
  const data = requireObject((await api.get(`/ai/portfolio-brief/${encodeURIComponent(code)}`, {
    params: { account_id: accountId, profile }, signal, cache: false,
  })).data);
  const sections = ['current_status', 'entry_context', 'position_summary', 'recent_issues',
    'positive_factors', 'risk_factors', 'watch_points', 'limitations'];
  if (data.symbol_code !== String(code)
    || !['headline', 'disclaimer'].every(key => typeof data[key] === 'string' && data[key].trim())
    || !sections.every(key => Array.isArray(data[key]) && data[key].length <= 3
      && data[key].every(item => typeof item === 'string' && item.trim()))
    || !data.current_status.length) {
    throw new Error('브리핑 응답 형식을 확인할 수 없습니다.');
  }
  return data;
};
async function withPostSymbolName(post, signal) {
  if (!post.symbol_code || post.attachments?.symbol_name) return post;
  try {
    const stock = await fetchStock(post.symbol_code, signal);
    return { ...post, attachments: { ...post.attachments, symbol_name: stock.name } };
  } catch (error) {
    if (signal?.aborted || error.response?.status === 401) throw error;
    return post;
  }
}
export const fetchPosts = async (page, signal, size = 20, symbol_code) => {
  const data = requireObject(await get('/community/posts', { page, size, symbol_code: symbol_code || undefined }, signal));
  const items = [...requireArray(data.items)];
  // Older list responses omit the body. Hydrate those rows without issuing an
  // unbounded burst, while current servers return complete timeline entries.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      const post = items[index];
      if (post.content !== undefined && post.attachments !== undefined) {
        items[index] = await withPostSymbolName(post, signal);
        continue;
      }
      try { items[index] = { ...post, ...await fetchPost(post.post_id, signal) }; }
      catch (error) { if (signal?.aborted || error.response?.status === 401) throw error; items[index] = { ...post, detailUnavailable: true }; }
    }
  }));
  return { ...data, items };
};
export const fetchPost = async (id, signal) => withPostSymbolName(requireObject(await get(`/community/posts/${id}`, undefined, signal)), signal);
export const createPost = async (payload) => {
  if (payload.images?.length || payload.poll || payload.trade_id || payload.quote_post_id) {
    let capabilities;
    try { capabilities = (await api.get('/community/capabilities', { cache: false })).data; }
    catch (error) {
      if (error.response?.status !== 404) throw error;
      throw new Error('현재 서버는 사진·투표·거래내역·인용 저장을 지원하지 않습니다. 서버 업데이트 후 다시 등록해 주세요. 작성 내용은 유지됩니다.', { cause: error });
    }
    if (!capabilities?.attachments || (payload.quote_post_id && !capabilities?.quotes)) throw new Error('서버 업데이트가 필요합니다. 첨부 내용이 누락되지 않도록 등록을 중단했습니다.');
  }
  return (await api.post('/community/posts', payload)).data;
};
export const createComment = async (id, content) => (await api.post(`/community/posts/${id}/comments`, { content })).data;
export const updatePost = async (id, payload) => (await api.put(`/community/posts/${id}`, payload)).data;
export const deletePost = async (id) => (await api.delete(`/community/posts/${id}`)).data;
export const toggleLike = async (id) => (await api.post(`/community/posts/${id}/like`)).data;
export const votePost = async (id, option_index) => (await api.put(`/community/posts/${id}/vote`, { option_index })).data;
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
      const quote = await fetchPrice(code, signal, attempt > 0 ? { cache: false } : {});
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

export const fetchOrderBook = async (code, signal) => requireObject((await api.get(`/trading/orders/book/${encodeURIComponent(code)}`, { signal, cache: false })).data);
export const checkPendingOrder = async id => requireObject((await api.post(`/trading/orders/${encodeURIComponent(id)}/check`)).data);

export const fetchMisu = async (accountId, signal) => requireObject(await get(`/trading/misu/${encodeURIComponent(accountId)}`, undefined, signal));
export const repayMisu = async (accountId, payload) => requireObject((await api.post(`/trading/misu/${encodeURIComponent(accountId)}/repay`, payload)).data);
export const settleMisu = async accountId => requireObject((await api.post(`/trading/misu/${encodeURIComponent(accountId)}/settle`)).data);
