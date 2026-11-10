import { useEffect } from 'react';

// Wait until the previous request finishes; pause while the document is hidden.
export default function useAutoRefresh(resource, interval = 300_000, enabled = true) {
  const { reload, loading, error } = resource;
  useEffect(() => {
    if (!enabled || loading) return;
    let timer;
    const schedule = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'hidden') timer = setTimeout(reload, error ? Math.min(interval, 30_000) : interval);
    };
    const visibility = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'hidden') reload();
    };
    schedule();
    document.addEventListener('visibilitychange', visibility);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [reload, loading, error, interval, enabled]);
}
