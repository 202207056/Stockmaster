import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { floatingViewport } from '../../utils/floatingViewport';
import { EDGE_TAB_WIDTH, placeEdgeTab } from '../../utils/edgeTabGeometry';
import './MobileEdgeTab.css';

export default function MobileEdgeTab({ storageKey, label, defaultY, children, onOpen, buttonRef, controls }) {
  const { pathname, search } = useLocation();
  const root = useRef(null);
  const [position, setPosition] = useState(() => {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* Optional. */ }
    const side = saved?.side === 'left' ? 'left' : 'right';
    const view = floatingViewport();
    return { side, ...placeEdgeTab({ x: side === 'left' ? 0 : view.width - EDGE_TAB_WIDTH, y: Number.isFinite(saved?.y) ? saved.y : defaultY }, view) };
  });
  const latest = useRef(position);
  const gesture = useRef(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const place = useCallback((point, dock = false) => {
    const view = floatingViewport();
    const side = point.x + EDGE_TAB_WIDTH / 2 < view.width / 2 ? 'left' : 'right';
    const obstacles = [...document.querySelectorAll('.mobile-edge-tab')].filter(element => element !== root.current).map(element => ({ x: Number(element.dataset.edgeX), y: Number(element.dataset.edgeY) }));
    const next = placeEdgeTab({ x: dock ? side === 'left' ? 0 : view.width - EDGE_TAB_WIDTH : point.x, y: point.y }, view, obstacles);
    const value = { ...next, side: next.x + EDGE_TAB_WIDTH / 2 < view.width / 2 ? 'left' : 'right' };
    latest.current = value;
    // Reserve the destination before other tabs process the same mount/resize.
    if (root.current) { root.current.dataset.edgeX = String(value.x); root.current.dataset.edgeY = String(value.y); }
    setPosition(previous => previous.x === value.x && previous.y === value.y && previous.side === value.side ? previous : value);
  }, []);
  useLayoutEffect(() => {
    const resize = () => {
      if (gesture.current) return;
      place({ x: latest.current.side === 'left' ? 0 : floatingViewport().width - EDGE_TAB_WIDTH, y: latest.current.y }, true);
    };
    resize();
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); };
  }, [pathname, search, place]);
  useEffect(() => {
    if (!dragging) try { localStorage.setItem(storageKey, JSON.stringify({ side: position.side, y: position.y })); } catch { /* Optional. */ }
  }, [position, storageKey, dragging]);
  const end = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setDragging(false);
    place(latest.current, true);
  };
  return <button ref={element => { root.current = element; if (buttonRef) buttonRef.current = element; }} type="button"
    className="mobile-edge-tab" data-side={position.side} data-dragging={dragging} data-edge-x={position.x} data-edge-y={position.y}
    style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }} aria-label={label} aria-expanded={false} aria-controls={controls}
    title={`${label} · 드래그로 좌우 가장자리와 높이 이동`}
    onPointerDown={event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      moved.current = false;
      const rect = event.currentTarget.getBoundingClientRect();
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: rect.x, startY: rect.y };
      setDragging(true);
      place({ x: rect.x, y: rect.y });
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const drag = gesture.current;
      if (!drag || drag.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) moved.current = true;
      if (moved.current) place({ x: drag.startX + event.clientX - drag.x, y: drag.startY + event.clientY - drag.y });
    }} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    onClick={event => { if (event.detail !== 0 && moved.current) { moved.current = false; return; } onOpen(); }}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      place({ x: event.key === 'ArrowLeft' ? 0 : event.key === 'ArrowRight' ? floatingViewport().width - EDGE_TAB_WIDTH : latest.current.x,
        y: latest.current.y + (event.key === 'ArrowUp' ? -16 : event.key === 'ArrowDown' ? 16 : 0) }, true);
    }}>{children}</button>;
}
