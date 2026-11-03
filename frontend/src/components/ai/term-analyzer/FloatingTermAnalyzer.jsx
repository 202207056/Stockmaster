import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { GripVertical, ScanText, X } from 'lucide-react';
import { anchorFromRect, BUTTON, clampRect, DEFAULT_ANCHOR, DEFAULT_PANEL, readJson, rectFromAnchor, resizeRect, validAnchor, validSize, writeJson } from './floatGeometry';
import { isAnalyzerRoute } from './terms';
import PanelBoundary from './PanelBoundary';
import './ocr.css';
import { WIKI_ENABLED } from './wikiLookup';
import { useNewsTermSelection } from './termSelection';
import useTermAnalyzerSetting from './useTermAnalyzerSetting';

const AnalysisPanel = lazy(() => import('./TermAnalysisPanel'));
function overlaySnapshot() {
  return !!document.querySelector('dialog[open]:not([data-ocr-editor]):not([data-term-confirm]), [aria-modal="true"]:not([data-ocr-editor]):not([data-term-confirm]), .tutorial-skip-button')
    || (window.innerWidth < 640 && !!document.querySelector('.mini-assets.is-open'));
}
function subscribeOverlays(listener) {
  const observer = new MutationObserver(listener);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'aria-modal', 'class'] });
  window.addEventListener('resize', listener);
  return () => { observer.disconnect(); window.removeEventListener('resize', listener); };
}

export default function FloatingTermAnalyzer() {
  const location = useLocation();
  const blocked = useSyncExternalStore(subscribeOverlays, overlaySnapshot, () => false);
  // An experimental feature: shown only after it is turned on in My page.
  const [enabled] = useTermAnalyzerSetting();
  if (!enabled || !isAnalyzerRoute(location.pathname, location.search) || blocked) return null;
  return <Surface key={location.pathname + location.search} />;
}

const ANCHOR_KEY = 'stockmaster:term-analyzer-anchor';
const SIZE_KEY = 'stockmaster:term-analyzer-size';
const MINIMIZED_KEY = 'stockmaster:term-analyzer-minimized';
const MARKS_KEY = 'stockmaster:term-analyzer-marks';
// Kept for this browser tab, so the panel stays open when moving to another screen.
const OPEN_KEY = 'stockmaster:term-analyzer-open';
const EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const readMinimized = () => { try { return localStorage.getItem(MINIMIZED_KEY) === 'true'; } catch { return false; } };
const isMobile = () => window.matchMedia?.('(max-width: 639px)').matches ?? false;
const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
const placed = (rect) => ({ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
// The panel hugs its content up to the chosen height and grows away from the anchored corner.
const anchored = (rect, anchor, view) => ({
  left: 'auto', right: 'auto', top: 'auto', bottom: 'auto',
  [anchor.h]: `${anchor.h === 'left' ? rect.x : view.width - rect.x - rect.w}px`,
  [anchor.v]: `${anchor.v === 'top' ? rect.y : view.height - rect.y - rect.h}px`,
  width: `${rect.w}px`, maxHeight: `${rect.h}px`,
});

function useViewport() {
  const [view, setView] = useState(viewport);
  useEffect(() => {
    const update = () => setView(viewport());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return view;
}

function Surface() {
  const selectedNewsWord = useNewsTermSelection(WIKI_ENABLED);
  const view = useViewport();
  const [open, setOpen] = useState(() => { try { return sessionStorage.getItem(OPEN_KEY) === 'true'; } catch { return false; } });
  const [minimized, setMinimized] = useState(readMinimized);
  // Whether found words are marked on the page where they were captured.
  const [marksOn, setMarksOn] = useState(() => { try { return localStorage.getItem(MARKS_KEY) !== 'false'; } catch { return true; } });
  const [anchor, setAnchor] = useState(() => readJson(ANCHOR_KEY, validAnchor) || DEFAULT_ANCHOR);
  const [size, setSize] = useState(() => readJson(SIZE_KEY, validSize) || DEFAULT_PANEL);
  const root = useRef(null);
  const trigger = useRef(null);
  const closeButton = useRef(null);
  const gesture = useRef(null);
  const dragged = useRef(false);
  const button = rectFromAnchor(anchor, BUTTON, view);
  const panel = rectFromAnchor(anchor, size, view);

  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); }, []);
  const hideForCapture = useCallback((hidden) => { if (root.current) root.current.dataset.capturing = String(hidden); }, []);

  useEffect(() => { writeJson(ANCHOR_KEY, anchor); }, [anchor]);
  useEffect(() => { writeJson(SIZE_KEY, size); }, [size]);
  useEffect(() => { try { localStorage.setItem(MINIMIZED_KEY, String(minimized)); } catch { /* Optional. */ } }, [minimized]);
  useEffect(() => { try { localStorage.setItem(MARKS_KEY, String(marksOn)); } catch { /* Optional. */ } }, [marksOn]);
  useEffect(() => { try { sessionStorage.setItem(OPEN_KEY, String(open)); } catch { /* Optional. */ } }, [open]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus({ preventScroll: true });
    const escape = (event) => {
      if (document.querySelector('dialog[data-ocr-editor][open], dialog[data-term-confirm][open]')) return;
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close(); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, close]);

  // One pointer gesture moves the button, moves the panel, or resizes the panel from an edge.
  const begin = (event) => {
    if (isMobile() || event.button !== 0 || !event.isPrimary) return;
    const mode = event.currentTarget.dataset.drag;
    const box = event.currentTarget.closest('.ocr-launcher, .ocr-panel').getBoundingClientRect();
    const rect = { x: box.left, y: box.top, w: box.width, h: box.height };
    if (mode === 'move' && event.target.closest('button') && event.target !== trigger.current && !trigger.current?.contains(event.target)) return;
    dragged.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, mode, rect };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (mode !== 'move') event.preventDefault();
  };
  const move = (event) => {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
    if (!dragged.current && Math.hypot(dx, dy) <= 5) return;
    dragged.current = true;
    const current = viewport();
    if (drag.mode === 'move') {
      setAnchor(anchorFromRect(clampRect({ ...drag.rect, x: drag.rect.x + dx, y: drag.rect.y + dy }, current), current));
    } else {
      const next = resizeRect(drag.rect, drag.mode, dx, dy, current);
      setSize({ w: next.w, h: next.h });
      setAnchor(anchorFromRect(next, current));
    }
  };
  const end = () => { gesture.current = null; };
  const pointer = { onPointerDown: begin, onPointerMove: move, onPointerUp: end, onPointerCancel: end, onLostPointerCapture: end };
  const nudge = (event) => {
    const offsets = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    if (!offsets[event.key] || isMobile()) return;
    event.preventDefault();
    const [dx, dy] = offsets[event.key];
    setAnchor(anchorFromRect(clampRect({ ...button, x: button.x + dx, y: button.y + dy }, view), view));
  };

  const minimize = () => { setOpen(false); setMinimized(true); };
  const restore = () => { setMinimized(false); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); };

  return createPortal(<div ref={root} className="ocr-widget" data-ocr-widget>
    {minimized ? <button type="button" className="ocr-restore" style={{ top: `${Math.min(button.y, view.height - 52)}px` }}
      aria-label="AI 용어 분석 버튼 다시 보이기" title="AI 용어 분석 다시 보이기" onClick={restore}>
      <ScanText size={16} aria-hidden="true" />
    </button> : !open && <div className="ocr-launcher" style={placed(button)}>
      <button ref={trigger} type="button" className="ocr-trigger" aria-label="AI 용어 분석" title="AI 용어 분석 · 드래그 또는 방향키로 이동"
        aria-expanded={false} aria-controls="ocr-analysis-panel" data-drag="move" {...pointer} onKeyDown={nudge}
        onClick={(event) => { if (event.detail !== 0 && dragged.current) { dragged.current = false; return; } setOpen(true); }}>
        <ScanText size={24} aria-hidden="true" />
      </button>
      <button type="button" className="ocr-minimize" aria-label="AI 용어 분석 버튼 최소화" title="최소화" onClick={minimize}>
        <X size={12} aria-hidden="true" />
      </button>
    </div>}
    {open && <aside id="ocr-analysis-panel" className="ocr-panel" style={anchored(panel, anchor, view)} data-anchor={`${anchor.v}-${anchor.h}`}
      role="dialog" aria-modal="false" aria-labelledby="ocr-panel-title">
      <header className="ocr-panel-header" title="드래그해서 옮길 수 있어요" data-drag="move" {...pointer}>
        <GripVertical size={16} className="ocr-grip" aria-hidden="true" />
        <h2 id="ocr-panel-title" className="ocr-panel-title">AI 용어 분석<span>어려운 투자용어를 쉽게</span></h2>
        <button type="button" className="ocr-switch" role="switch" aria-checked={marksOn} title="캡처한 곳에 찾은 용어 표시"
          onClick={() => setMarksOn((on) => !on)}>화면 표시<span>{marksOn ? 'ON' : 'OFF'}</span></button>
        <button ref={closeButton} type="button" className="ocr-icon-button" aria-label="용어 분석 닫기" onClick={close}><X size={18} aria-hidden="true" /></button>
      </header>
      <PanelBoundary><Suspense fallback={<p className="ocr-note" role="status">분석 도구를 불러오고 있습니다…</p>}>
        <AnalysisPanel onCaptureVisibility={hideForCapture} selectedNewsWord={selectedNewsWord} showMarks={marksOn} />
      </Suspense></PanelBoundary>
      {EDGES.map((edge) => <span key={edge} className={`ocr-resize ocr-resize-${edge}`} aria-hidden="true" data-drag={edge} {...pointer} />)}
    </aside>}
  </div>, document.body);
}
