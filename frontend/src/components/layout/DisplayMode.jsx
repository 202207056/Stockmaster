import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import './DisplayMode.css';
import { subscribeTheme } from '../../utils/theme';

const currentPath = () => window.location.pathname + window.location.search + window.location.hash;

function initialMode() {
  // Each visit starts with the current viewport, regardless of past switches.
  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}

/** Keep one live app mounted: changing its viewport preserves forms and dialogs.
 * A real viewport also keeps CSS media queries, charts, portals and touch tools
 * in agreement. The outer document owns the shareable URL and browser history.
 */
export default function DisplayMode() {
  const [mode, setMode] = useState(initialMode);
  const [src] = useState(currentPath);
  const frame = useRef(null);
  useEffect(() => subscribeTheme(() => {}), []);

  useEffect(() => {
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'stockmaster:display-ready') {
        event.source.postMessage({ type: 'stockmaster:display-state', mode }, window.location.origin);
        return;
      }
      if (event.data?.type === 'stockmaster:display-mode') {
        const value = event.data.mode;
        if (value !== 'mobile' && value !== 'desktop') return;
        setMode(value);
        return;
      }
      if (event.data?.type !== 'stockmaster:route') return;
      const { path, replace } = event.data;
      if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return;
      if (path !== currentPath()) window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
    };
    const pop = () => frame.current?.contentWindow.postMessage({ type: 'stockmaster:navigate', path: currentPath() }, window.location.origin);
    window.addEventListener('message', receive);
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('message', receive); window.removeEventListener('popstate', pop); };
  }, [mode]);
  useEffect(() => {
    frame.current?.contentWindow.postMessage({ type: 'stockmaster:display-state', mode }, window.location.origin);
  }, [mode]);

  return <div className="display-shell" data-mode={mode}>
    <div className="display-viewport">
      <iframe ref={frame} name="stockmaster-display" title="인생한방 사이트" src={src} className="display-frame" allow="clipboard-read; clipboard-write" />
    </div>
  </div>;
}

export function DisplayRouteSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const incoming = useRef(null);
  useEffect(() => {
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'stockmaster:navigate') return;
      const path = event.data.path;
      if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return;
      incoming.current = path;
      navigate(path, { replace: true });
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [navigate]);
  useEffect(() => {
    const path = location.pathname + location.search + location.hash;
    // Keep location-based API helpers and copied links in sync as well.
    window.history.replaceState(null, '', path);
    if (incoming.current !== path) window.parent.postMessage({ type: 'stockmaster:route', path, replace: navigationType === 'REPLACE' }, window.location.origin);
    incoming.current = null;
  }, [location, navigationType]);
  return null;
}
