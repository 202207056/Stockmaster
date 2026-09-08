import { useCallback, useEffect, useState } from 'react';
import useAuth from './useAuth';

// The loader is a useCallback. Its identity and the user id partition fetched data.
export default function useRemote(loader, enabled = true) {
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
        if (!controller.signal.aborted) setState({ loader, owner, revision, data: null, error });
      }
    };
    run();
    return () => controller.abort();
  }, [loader, enabled, owner, revision]);
  const current = enabled && state?.loader === loader && state?.owner === owner && state?.revision === revision;
  return { data: current ? state.data : null, error: current ? state.error : null, loading: enabled && !current, reload };
}
