import axios from 'axios';

export const REQUEST_CACHE_TTL = 5_000;
const freshSignals = new WeakSet();
export function requireFreshRequest(signal) { freshSignals.add(signal); }

// All GETs through the shared client opt in, including future endpoints.
// Short-lived memory cache never turns an expired response into a live quote.
export function installRequestCache(api, getSession) {
  const entries = new Map();
  let generation = 0;
  const clear = () => { generation += 1; entries.clear(); };
  api.interceptors.request.use(config => {
    const method = (config.method || 'get').toLowerCase();
    const mutation = !['get', 'head', 'options'].includes(method);
    if (mutation) clear();
    const session = getSession();
    const version = generation;
    const cacheable = method === 'get' && config.cache !== false && !freshSignals.has(config.signal);
    const key = JSON.stringify([session, api.getUri(config), config.responseType || 'json', config.headers?.toJSON?.() || config.headers]);
    const adapter = axios.getAdapter(config.adapter || api.defaults.adapter);
    config.adapter = async request => {
      const cached = cacheable && entries.get(key);
      if (cached && Date.now() - cached.savedAt < REQUEST_CACHE_TTL) {
        return { ...cached.response, data: structuredClone(cached.response.data), config: request };
      }
      entries.delete(key);
      try {
        const response = await adapter(request);
        if (cacheable && response.status >= 200 && response.status < 300 && version === generation && session === getSession() && !request.signal?.aborted) {
          try {
            entries.set(key, { savedAt: Date.now(), response: { data: structuredClone(response.data), status: response.status, statusText: response.statusText, headers: response.headers } });
            if (entries.size > 200) entries.delete(entries.keys().next().value);
          } catch { /* Non-cloneable responses remain network-only. */ }
        }
        return response;
      } finally {
        if (mutation) clear();
      }
    };
    return config;
  });
  return clear;
}
