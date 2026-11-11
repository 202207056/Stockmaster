import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useTutorialSetting from '../../hooks/useTutorialSetting';
import useTutorialPopupSetting from '../../hooks/useTutorialPopupSetting';
import { floatingViewport, raiseFloatingPanel } from '../../utils/floatingViewport';
import './FloatingTutorial.css';

const POSITION_KEY = 'stockmaster:tutorial-popup-position';
function initialPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY));
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) return saved;
  } catch { /* Optional persistence. */ }
  return { x: Math.max(8, window.innerWidth - 94), y: 246 };
}

export default function FloatingTutorial() {
  const [visible] = useTutorialPopupSetting();
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const eligible = ['/dashboard', '/trading', '/assets', '/favorites', '/community', '/mypage', '/learn'].includes(pathname);
  return visible && isAuthenticated && eligible && !params.has('tour') && !params.has('practice') ? <TutorialPanel /> : null;
}

function TutorialPanel() {
  const [enabled, setEnabled] = useTutorialSetting();
  const [position, setPosition] = useState(initialPosition);
  const root = useRef(null);
  const gesture = useRef(null);
  const moved = useRef(false);
  const { pathname } = useLocation();
  const clamp = useCallback(point => {
    const view = floatingViewport();
    const rect = root.current?.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(point.x, view.width - (rect?.width || 78) - 8)),
      y: Math.max(8, Math.min(point.y, view.height - (rect?.height || 44) - 8)),
    };
  }, []);
  useLayoutEffect(() => {
    const fit = () => setPosition(previous => {
      const next = clamp(previous);
      return next.x === previous.x && next.y === previous.y ? previous : next;
    });
    const observer = new ResizeObserver(fit);
    observer.observe(root.current);
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    fit();
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('resize', fit); };
  }, [clamp, pathname]);
  useEffect(() => {
    try { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch { /* Optional persistence. */ }
  }, [position]);
  const endDrag = () => { gesture.current = null; };
  return <aside ref={root} className="floating-tutorial" aria-label="튜토리얼 빠른 설정"
    style={{ left: position.x, top: position.y }} onPointerDownCapture={event => raiseFloatingPanel(event.currentTarget)}>
      <button type="button" className="floating-tutorial-switch" role="switch" aria-checked={enabled} aria-label="튜토리얼 자동 안내" title="튜토리얼 자동 안내"
        onClick={event => {
          if (event.detail !== 0 && moved.current) { moved.current = false; return; }
          setEnabled(!enabled);
        }}
        onPointerDown={event => {
          if (event.button !== 0 || event.isPrimary === false) return;
          moved.current = false;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, position };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const drag = gesture.current;
          if (drag?.id !== event.pointerId) return;
          const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
          if (Math.hypot(dx, dy) > 5) moved.current = true;
          if (moved.current) setPosition(clamp({ x: drag.position.x + dx, y: drag.position.y + dy }));
        }} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
        onKeyDown={event => {
          const offsets = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
          if (!offsets[event.key]) return;
          event.preventDefault();
          const [dx, dy] = offsets[event.key];
          setPosition(previous => clamp({ x: previous.x + dx, y: previous.y + dy }));
        }}><span>{enabled ? 'ON' : 'OFF'}</span><i aria-hidden="true" /></button>
  </aside>;
}
