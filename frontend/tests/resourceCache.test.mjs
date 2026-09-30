import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  CustomEvent: dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const cache = await server.ssrLoadModule('/src/api/resourceCache.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const { AuthProvider } = await server.ssrLoadModule('/src/contexts/AuthContext.jsx');
const { default: useRemote } = await server.ssrLoadModule('/src/hooks/useRemote.js');
const { default: RemoteState } = await server.ssrLoadModule('/src/components/common/RemoteState.jsx');
const container = document.getElementById('root');
const publicKey = key => cache.resourceKey(client.API_BASE_URL, 'public', key);
const privateKey = (owner, key) => cache.resourceKey(client.API_BASE_URL, [client.getSessionId(), owner], key);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
beforeEach(() => localStorage.clear());

test('storage expires, bounds entries, isolates API/session/account keys and tolerates invalid storage', () => {
  cache.writeResource(publicKey('price:A'), { price: 100 });
  cache.writeResource(cache.resourceKey('other-api', 'public', 'price:A'), { price: 200 });
  assert.equal(cache.readResource(publicKey('price:A')).data.price, 100);
  assert.equal(cache.readResource(publicKey('price:B')), null);
  client.setToken('session-one');
  cache.writeResource(privateKey(1, 'portfolio:7'), { cash: 10 }, true);
  cache.writeResource(privateKey(1, 'portfolio:8'), { cash: 20 }, true);
  assert.equal(cache.readResource(privateKey(1, 'portfolio:7')).data.cash, 10);
  assert.equal(cache.readResource(privateKey(2, 'portfolio:7')), null);
  client.setToken('session-two');
  assert.equal(cache.readResource(privateKey(1, 'portfolio:7')), null);
  assert.equal(cache.readResource(publicKey('price:A')).data.price, 100);
  const expired = [{ key: 'old', data: [], private: false, savedAt: Date.now() - cache.CACHE_MAX_AGE - 1 }];
  localStorage.setItem(cache.CACHE_STORAGE_KEY, JSON.stringify(expired));
  assert.equal(cache.readResource('old'), null);
  for (let i = 0; i < 110; i++) cache.writeResource(String(i), []);
  assert.equal(JSON.parse(localStorage.getItem(cache.CACHE_STORAGE_KEY)).length, 100);
  localStorage.setItem(cache.CACHE_STORAGE_KEY, 'corrupt');
  assert.equal(cache.readResource('old'), null);
  const storage = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  try { assert.equal(cache.readResource('x'), null); assert.doesNotThrow(() => cache.writeResource('x', [])); }
  finally { globalThis.localStorage = storage; }
});

test('cached content renders before a pending response, survives outage, then refreshes and remounts', async () => {
  cache.writeResource(publicKey('quote'), { price: 100 });
  let request = deferred();
  let latest;
  const loader = () => request.promise;
  function Probe() {
    latest = useRemote(loader, true, { cacheKey: 'quote', publicCache: true });
    return React.createElement(RemoteState, { resource: latest, requiresAuth: false }, `PRICE:${latest.data?.price}`);
  }
  const tree = () => React.createElement(AuthContext.Provider, { value: { user: null } }, React.createElement(Probe));
  let root = createRoot(container);
  try {
    await act(async () => root.render(tree()));
    assert(container.textContent.includes('PRICE:100'));
    assert(!container.textContent.includes('이전 데이터'));
    assert(latest.loading && latest.stale);
    await act(async () => request.reject(new Error('offline')));
    assert(container.textContent.includes('PRICE:100'));
    assert(!container.textContent.includes('갱신에 실패'));
    request = deferred();
    await act(async () => window.dispatchEvent(new dom.window.Event('online')));
    await act(async () => request.resolve({ price: 150 }));
    assert.equal(latest.data.price, 150);
    assert(!latest.stale && !latest.loading);
    await act(async () => root.unmount());
    request = deferred();
    root = createRoot(container);
    await act(async () => root.render(tree()));
    assert.equal(latest.data.price, 150);
    assert(latest.stale && latest.loading);
    await act(async () => request.reject({ response: { status: 403 } }));
    assert.equal(latest.data, null);
    assert.equal(cache.readResource(publicKey('quote')), null);
  } finally { await act(async () => root.unmount()); }
});

test('account switches and late responses cannot leak or restore logged-out private data', async () => {
  client.setToken('private-session');
  const oldKey = privateKey(1, 'portfolio:7');
  cache.writeResource(oldKey, { cash: 7 }, true);
  cache.writeResource(privateKey(1, 'portfolio:8'), { cash: 8 }, true);
  const a = deferred(), b = deferred();
  const loaders = { 7: () => a.promise, 8: () => b.promise };
  let latest;
  function Probe({ account }) {
    latest = useRemote(loaders[account], true, { cacheKey: `portfolio:${account}` });
    return null;
  }
  const root = createRoot(container);
  const tree = account => React.createElement(AuthContext.Provider, { value: { user: { user_id: 1 } } }, React.createElement(Probe, { account }));
  try {
    await act(async () => root.render(tree(7)));
    assert.equal(latest.data.cash, 7);
    await act(async () => root.render(tree(8)));
    assert.equal(latest.data.cash, 8);
    await act(async () => a.resolve({ cash: 777 }));
    assert.equal(latest.data.cash, 8);
    client.clearToken();
    await act(async () => b.resolve({ cash: 888 }));
    assert.equal(cache.readResource(oldKey), null);
    assert(!JSON.parse(localStorage.getItem(cache.CACHE_STORAGE_KEY)).some(entry => entry.private));
  } finally { await act(async () => root.unmount()); }
});

test('empty cached results survive loading and reopening triggers visible revalidation', async () => {
  cache.writeResource(publicKey('empty'), []);
  let request = deferred(), latest;
  const loader = () => request.promise;
  function Probe({ enabled }) {
    latest = useRemote(loader, enabled, { cacheKey: 'empty', publicCache: true });
    return React.createElement(RemoteState, { resource: latest, requiresAuth: false, empty: latest.data?.length === 0 }, 'rows');
  }
  const root = createRoot(container);
  const tree = enabled => React.createElement(AuthContext.Provider, { value: { user: null } }, React.createElement(Probe, { enabled }));
  try {
    await act(async () => root.render(tree(true)));
    assert(!container.textContent.includes('이전 데이터'));
    assert(container.textContent.includes('현재 표시할 데이터가 없어요'));
    await act(async () => request.resolve([]));
    assert(!latest.stale);
    await act(async () => root.render(tree(false)));
    assert.equal(latest.data, null);
    request = deferred();
    await act(async () => root.render(tree(true)));
    assert(latest.loading && latest.stale);
    await act(async () => request.resolve([{ id: 1 }]));
    assert.equal(latest.data.length, 1);
  } finally { await act(async () => root.unmount()); }
});

test('session restoration displays cached portfolio without granting authentication; logout clears it', async () => {
  client.setToken('restore-session');
  const user = { user_id: 9 };
  const accounts = [{ account_id: 7, account_name: 'saved account' }];
  cache.writeResource(cache.resourceKey(client.API_BASE_URL, client.getSessionId(), 'session'), { user, accounts }, true);
  cache.writeResource(privateKey(9, 'portfolio:7'), { cash: 42 }, true);
  const me = deferred();
  client.default.defaults.adapter = async config => ({ data: await me.promise, status: 200, headers: {}, config });
  let auth, resource, loads = 0;
  const loader = async () => { loads++; return { cash: 99 }; };
  function Probe() {
    auth = React.useContext(AuthContext);
    resource = useRemote(loader, auth.isAuthenticated, { cacheKey: `portfolio:${auth.accountId}`, cachePreview: true });
    return React.createElement(RemoteState, { resource, authenticated: auth.isAuthenticated }, `CASH:${resource.data?.cash}`);
  }
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(AuthProvider, null, React.createElement(Probe)))));
    assert.equal(auth.isAuthenticated, false);
    assert.equal(auth.hasCachedSession, true);
    assert.equal(resource.preview, true);
    assert.equal(loads, 0);
    assert(container.textContent.includes('CASH:42'));
    await act(async () => me.reject(new Error('server asleep')));
    assert(container.textContent.includes('CASH:42'));
    assert.equal(auth.isAuthenticated, false);
    await act(async () => auth.logout());
    assert.equal(resource.data, null);
    assert(!container.textContent.includes('CASH:42'));
    assert(!JSON.parse(localStorage.getItem(cache.CACHE_STORAGE_KEY)).some(entry => entry.private));
  } finally { await act(async () => root.unmount()); }
});

test('an explicit authorization rejection clears restored session data', async () => {
  client.setToken('revoked-session');
  cache.writeResource(cache.resourceKey(client.API_BASE_URL, client.getSessionId(), 'session'), {
    user: { user_id: 9 }, accounts: [{ account_id: 7 }],
  }, true);
  const me = deferred();
  client.default.defaults.adapter = async config => {
    await me.promise;
    throw Object.assign(new Error('forbidden'), { response: { status: 403 }, config, isAxiosError: true });
  };
  let auth;
  function Probe() { auth = React.useContext(AuthContext); return null; }
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(AuthProvider, null, React.createElement(Probe))));
    assert.equal(auth.hasCachedSession, true);
    await act(async () => me.resolve());
    assert.equal(auth.user, null);
    assert.equal(auth.hasCachedSession, false);
    assert.equal(client.getToken(), null);
    assert(!JSON.parse(localStorage.getItem(cache.CACHE_STORAGE_KEY)).some(entry => entry.private));
  } finally { await act(async () => root.unmount()); }
});
