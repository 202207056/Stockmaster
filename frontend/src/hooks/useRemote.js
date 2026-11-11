import { useCallback, useEffect, useMemo, useState } from 'react';
import useAuth from './useAuth';
import { API_BASE_URL, getSessionId, getToken } from '../api/client';
import { canRetainResource, readResource, removeResource, resourceKey, writeResource } from '../api/resourceCache';
import { requireFreshRequest } from '../api/requestCache';

const matchesSnapshot = (state, loader, owner, token, key) => state?.owner === owner
  && state?.token === token && state?.key === key && (key != null || state?.loader === loader);

// Explicit keys include every loader parameter. Unkeyed reads remain network-only.
export default function useRemote(loader, enabled = true, { keepPreviousData = false, cacheKey, publicCache = false, cachePreview = true, isIncomplete } = {}) {
  const { user, hasCachedSession } = useAuth();
  const owner = user?.user_id ?? null;
  const token = getToken();
  const sessionId = getSessionId();
  const key = cacheKey && (publicCache || (owner != null && sessionId && token))
    ? resourceKey(API_BASE_URL, publicCache ? 'public' : [sessionId, owner], cacheKey) : null;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  // A manual reload rereads storage, including writes from another mounted view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cached = useMemo(() => readResource(key), [key, revision]);
  const visible = enabled || (cachePreview && hasCachedSession && !!key);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    if (revision > 0) requireFreshRequest(controller.signal);
    const valid = () => !controller.signal.aborted && (publicCache || token === getToken());
    const run = async () => {
      await Promise.resolve();
      if (!valid()) return;
      setState(previous => {
        const matching = matchesSnapshot(previous, loader, owner, token, key);
        const fallback = matching && (key || keepPreviousData) ? previous : readResource(key);
        return { loader, owner, token, key, revision, pending: true, data: fallback?.data ?? null, savedAt: fallback?.savedAt, error: null };
      });
      try {
        const data = await loader(controller.signal);
        if (!valid()) return;
        // No response is not a successful empty list. Keep the last good snapshot.
        if (data == null) throw new Error('서버 응답을 확인할 수 없습니다.');
        const incomplete = isIncomplete?.(data);
        if (!incomplete) writeResource(key, data, !publicCache);
        setState(previous => {
          const matching = matchesSnapshot(previous, loader, owner, token, key);
          const fallback = matching ? previous : readResource(key);
          if (incomplete && fallback?.data != null) return {
            loader, owner, token, key, revision, data: fallback.data, savedAt: fallback.savedAt,
            error: new Error('Some data could not be refreshed.'),
          };
          return { loader, owner, token, key, revision, data, savedAt: Date.now(), error: null };
        });
      } catch (error) {
        if (!valid()) return;
        const retain = canRetainResource(error);
        if (!retain) removeResource(key);
        setState(previous => {
          const matching = matchesSnapshot(previous, loader, owner, token, key);
          const fallback = matching && (key || keepPreviousData) ? previous : readResource(key);
          return { loader, owner, token, key, revision, data: retain ? fallback?.data ?? null : null,
            savedAt: retain ? fallback?.savedAt : null, error };
        });
      }
    };
    run();
    return () => controller.abort();
  }, [loader, enabled, owner, token, key, revision, keepPreviousData, publicCache, cached, isIncomplete]);
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('online', reload);
    if (key && !publicCache) window.addEventListener('orders:changed', reload);
    return () => {
      window.removeEventListener('online', reload);
      window.removeEventListener('orders:changed', reload);
    };
  }, [enabled, key, publicCache, reload]);
  const matching = state?.loader === loader && state?.owner === owner && state?.token === token && state?.key === key;
  const current = visible && matching && state.revision === revision && !state.pending;
  const retained = visible && matchesSnapshot(state, loader, owner, token, key) && (key || keepPreviousData);
  const selected = visible ? (current || retained ? state : cached) : null;
  const data = selected?.data ?? null;
  return { data, error: current ? state.error : null, loading: enabled && !current,
    stale: data != null && (!current || !!state.error || !enabled), savedAt: selected?.savedAt,
    preview: !enabled && visible && data != null, reload };
}
