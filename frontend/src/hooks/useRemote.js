import { useCallback, useEffect, useState } from 'react';
import useAuth from './useAuth';

// The loader is a useCallback. Its identity and the user id partition fetched data.
export default function useRemote(loader, enabled = true, { keepPreviousData = false } = {}) {
  const { user } = useAuth();
  const owner = user?.user_id ?? null;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const data = await loader(controller.signal);
        if (!controller.signal.aborted) setState({ loader, owner, revision, data, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState((previous) => ({ loader, owner, revision,
          data: keepPreviousData && previous?.loader === loader && previous?.owner === owner ? previous.data : null, error }));
      }
    };
    run();
    return () => controller.abort();
  }, [loader, enabled, owner, revision, keepPreviousData]);
  const current = enabled && state?.loader === loader && state?.owner === owner && state?.revision === revision;
  const retained = enabled && keepPreviousData && state?.loader === loader && state?.owner === owner;
  const data = current || retained ? state.data : null;
  return { data, error: current ? state.error : null, loading: enabled && !current, stale: !!data && (!current || !!state.error), reload };
}
