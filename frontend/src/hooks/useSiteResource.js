import useRemote from './useRemote';
import { useSitePractice } from '../contexts/site-practice';

// Explicit practice only. Normal API failures never fall back to fixtures.
export default function useSiteResource(key, loader, enabled = true, options) {
  const practice = useSitePractice();
  const remote = useRemote(loader, enabled && !practice, practice ? undefined : options);
  return practice ? { data: enabled ? practice.resource(key) : null, loading: false, error: null, stale: false, reload: () => practice.event(key === 'orders' ? 'history-refresh' : 'refresh') } : remote;
}
