import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { installRequestCache, requireFreshRequest, REQUEST_CACHE_TTL } from '../src/api/requestCache.js';

test('new GET endpoints cache by URL, params and session; freshness and mutations bypass cache', async () => {
  let calls = 0;
  let session = 'one';
  const api = axios.create({ adapter: async config => ({ data: { calls: ++calls }, status: 200, statusText: 'OK', headers: {}, config }) });
  installRequestCache(api, () => session);
  const read = config => api.get('/future-feature', config);
  assert.equal((await read()).data.calls, 1);
  assert.equal((await read()).data.calls, 1);
  assert.equal((await read({ params: { account: 2 } })).data.calls, 2);
  session = 'two';
  assert.equal((await read()).data.calls, 3);
  assert.equal((await read({ cache: false })).data.calls, 4);
  const controller = new AbortController();
  requireFreshRequest(controller.signal);
  assert.equal((await read({ signal: controller.signal })).data.calls, 5);
  await read();
  await api.post('/orders', {});
  assert.equal((await read()).data.calls, 8);
  const now = Date.now;
  Date.now = () => now() + REQUEST_CACHE_TTL + 1;
  try { assert.equal((await read()).data.calls, 9); }
  finally { Date.now = now; }
});

test('errors are not cached and reads started before a mutation cannot repopulate cache', async () => {
  let finish;
  let calls = 0;
  const api = axios.create({ adapter: async config => {
    calls += 1;
    if (calls === 1) await new Promise(resolve => { finish = resolve; });
    if (config.url === '/error') throw new Error('offline');
    return { data: calls, status: 200, statusText: 'OK', headers: {}, config };
  } });
  installRequestCache(api, () => 'session');
  const pending = api.get('/balance');
  await new Promise(resolve => setImmediate(resolve));
  await api.post('/orders');
  finish();
  await pending;
  await api.get('/balance');
  assert.equal(calls, 3);
  await assert.rejects(api.get('/error'));
  await assert.rejects(api.get('/error'));
  assert.equal(calls, 5);
});
