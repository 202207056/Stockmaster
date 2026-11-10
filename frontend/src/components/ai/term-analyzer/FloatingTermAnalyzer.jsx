import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { GripVertical, Highlighter, ScanText, X } from 'lucide-react';
import { anchorFromRect, BUTTON, clampRect, DEFAULT_ANCHOR, DEFAULT_PANEL, MARGIN, placePanel, readJson, rectFromAnchor, resizeRect, validAnchor, validSize, writeJson } from './floatGeometry';
import { isAnalyzerRoute } from './terms';
import PanelBoundary from './PanelBoundary';
import './ocr.css';
import useTermAnalyzerSetting from './useTermAnalyzerSetting';
import { floatingViewport, raiseFloatingPanel } from '../../../utils/floatingViewport';
import MobileEdgeTab from '../../common/MobileEdgeTab';

const AnalysisPanel = lazy(() => import('./TermAnalysisPanel'));
function overlaySnapshot() {
  return !!document.querySelector('dialog[open]:not([data-ocr-editor]), [aria-modal="true"]:not([data-ocr-editor]), .tutorial-skip-button');
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
// The height follows the content, so only the width can be dragged.
const EDGES = ['e', 'w'];
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const readMinimized = () => { try { return localStorage.getItem(MINIMIZED_KEY) === 'true'; } catch { return false; } };
const viewport = floatingViewport;
const placed = (rect) => ({ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
// Follows the height the panel's content needs, so the panel can grow and shrink smoothly instead of scrolling inside.
function useContentHeight(panel, active) {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const aside = panel.current;
    if (!active || !aside) return undefined;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const header = aside.querySelector('.ocr-panel-header');
        const body = aside.querySelector('.ocr-panel-body');
        const content = (header?.offsetHeight ?? 0) + (body ? body.scrollHeight : 120);
        setHeight(Math.ceil(content + aside.offsetHeight - aside.clientHeight));
      });
    };
    const sizes = new ResizeObserver(measure);
    const watch = () => {
      sizes.disconnect();
      const body = aside.querySelector('.ocr-panel-body');
      [...(body?.children ?? [])].forEach((child) => sizes.observe(child));
      measure();
    };
    const children = new MutationObserver(watch);
    children.observe(aside, { childList: true, subtree: true });
    watch();
    return () => { cancelAnimationFrame(frame); sizes.disconnect(); children.disconnect(); };
  }, [panel, active]);
  return active ? height : 0;
}

function useViewport() {
  const [view, setView] = useState(viewport);
  useEffect(() => {
    const update = () => setView(viewport());
    // The navigation is committed after the initial render; measure it then.
    const initial = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => { cancelAnimationFrame(initial); window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); };
  }, []);
  return view;
}

function Surface() {
  const view = useViewport();
  const [open, setOpen] = useState(() => { try { return sessionStorage.getItem(OPEN_KEY) === 'true'; } catch { return false; } });
  const [minimized, setMinimized] = useState(readMinimized);
  // Whether found words are marked on the page where they were captured.
  const [marksOn, setMarksOn] = useState(() => { try { return localStorage.getItem(MARKS_KEY) !== 'false'; } catch { return true; } });
  const [anchor, setAnchor] = useState(() => readJson(ANCHOR_KEY, validAnchor) || DEFAULT_ANCHOR);
  const [size, setSize] = useState(() => readJson(SIZE_KEY, validSize) || DEFAULT_PANEL);
  // While the panel folds back into the round button: where it shrinks to, before it is removed.
  const [closing, setClosing] = useState(null);
  const root = useRef(null);
  const trigger = useRef(null);
  const closeButton = useRef(null);
  const panelRef = useRef(null);
  // Where the panel puts its search box: in the header, so it takes no extra row.
  const [searchSlot, setSearchSlot] = useState(null);
  const gesture = useRef(null);
  const dragged = useRef(false);
  const button = rectFromAnchor(anchor, BUTTON, view);
  // Narrow screens keep the smaller panel (at most 340px wide and 65% of the height).
  const mobile = view.width < 768;
  const width = Math.min(mobile ? Math.min(size.w, 340) : size.w, view.width - MARGIN * 2);
  const contentHeight = useContentHeight(panelRef, open);
  const mobileHeight = Math.round(view.height * .65);
  // The button and the panel share one place: the panel opens with its top-left corner on the button,
  // and folds back into a button at its own top-left corner, so neither jumps elsewhere.
  const placedPanel = placePanel(button, width, mobile ? Math.min(contentHeight, mobileHeight) : contentHeight, view);
  const panelStyle = mobile ? { ...placedPanel, maxHeight: `${mobileHeight}px` } : placedPanel;
  const growFrom = `${button.x - parseFloat(panelStyle.left)}px ${button.y - parseFloat(panelStyle.top)}px`;
  const closeTimer = useRef(0);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const close = useCallback(() => {
    const box = panelRef.current?.getBoundingClientRect();
    const finish = () => { setClosing(null); setOpen(false); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); };
    if (!box || viewport().width < 768) { finish(); return; }
    const current = viewport();
    setAnchor(anchorFromRect(clampRect({ x: box.left, y: box.top, ...BUTTON }, current), current));
    if (reducedMotion()) { finish(); return; }
    setClosing({ sx: BUTTON.w / box.width, sy: BUTTON.h / box.height });
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(finish, 230);
  }, []);
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
      if (document.querySelector('dialog[data-ocr-editor][open]')) return;
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close(); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, close]);

  // One pointer gesture moves the button, moves the panel, or resizes the panel from an edge.
  const begin = (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const mode = event.currentTarget.dataset.drag;
    const box = event.currentTarget.closest('.ocr-launcher, .ocr-panel').getBoundingClientRect();
    const rect = { x: box.left, y: box.top, w: box.width, h: box.height };
    if (mode === 'move' && event.target.closest('input, form')) return;
    if (mode === 'move' && event.target.closest('button') && event.target !== trigger.current && !trigger.current?.contains(event.target)) return;
    dragged.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, mode, rect, panel: !!event.currentTarget.closest('.ocr-panel') };
    if (root.current) root.current.dataset.dragging = 'true';
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
    if (drag.mode === 'move' && drag.panel) {
      // Moving the panel moves the button with it: the button sits at the panel's top-left corner.
      setAnchor(anchorFromRect(clampRect({ x: drag.rect.x + dx, y: drag.rect.y + dy, ...BUTTON }, current), current));
    } else if (drag.mode === 'move') {
      setAnchor(anchorFromRect(clampRect({ ...drag.rect, x: drag.rect.x + dx, y: drag.rect.y + dy }, current), current));
    } else {
      const next = resizeRect(drag.rect, drag.mode, dx, dy, current);
      setSize((old) => ({ w: next.w, h: old.h }));
      setAnchor(anchorFromRect(clampRect({ x: next.x, y: drag.rect.y, ...BUTTON }, current), current));
    }
  };
  const end = () => { gesture.current = null; if (root.current) delete root.current.dataset.dragging; };
  const pointer = { onPointerDown: begin, onPointerMove: move, onPointerUp: end, onPointerCancel: end, onLostPointerCapture: end };
  const nudge = (event) => {
    const offsets = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    if (!offsets[event.key]) return;
    event.preventDefault();
    const [dx, dy] = offsets[event.key];
    setAnchor(anchorFromRect(clampRect({ ...button, x: button.x + dx, y: button.y + dy }, view), view));
  };

  const minimize = () => { setOpen(false); setMinimized(true); };
  const restore = () => { setMinimized(false); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); };

  return createPortal(<div ref={root} className="ocr-widget" data-ocr-widget>
    {mobile ? !open && <MobileEdgeTab storageKey="stockmaster:mobile-analyzer-edge" label="AI 용어 분석" defaultY={244} buttonRef={trigger} controls="ocr-analysis-panel" onOpen={() => { setMinimized(false); setOpen(true); }}><ScanText size={17} aria-hidden="true" /></MobileEdgeTab> : minimized ? <button type="button" className="ocr-restore" style={{ top: `${Math.min(button.y, view.height - 52)}px` }}
      aria-label="AI 용어 분석 버튼 다시 보이기" title="AI 용어 분석 다시 보이기" onClick={restore}>
      <ScanText size={16} aria-hidden="true" />
    </button> : !open && <div className="ocr-launcher" style={placed(button)} onPointerDownCapture={event => raiseFloatingPanel(event.currentTarget)}>
      <button ref={trigger} type="button" className="ocr-trigger" aria-label="AI 용어 분석" title="AI 용어 분석 · 드래그 또는 방향키로 이동"
        aria-expanded={false} aria-controls="ocr-analysis-panel" data-drag="move" {...pointer} onKeyDown={nudge}
        onClick={(event) => { if (event.detail !== 0 && dragged.current) { dragged.current = false; return; } setOpen(true); }}>
        <ScanText size={24} aria-hidden="true" />
      </button>
      <button type="button" className="ocr-minimize" aria-label="AI 용어 분석 버튼 최소화" title="최소화" onClick={minimize}>
        <X size={12} aria-hidden="true" />
      </button>
    </div>}
    {open && <aside ref={panelRef} id="ocr-analysis-panel" className={`ocr-panel${mobile ? ' is-compact' : ''}${closing ? ' is-closing' : ''}`}
      style={{ ...panelStyle, transformOrigin: closing ? '0 0' : growFrom, ...(closing && { '--sx': closing.sx, '--sy': closing.sy }) }}
      onPointerDownCapture={event => raiseFloatingPanel(event.currentTarget)}
      role="dialog" aria-modal="false" aria-labelledby="ocr-panel-title">
      <header className="ocr-panel-header" title="드래그해서 옮길 수 있어요" data-drag="move" {...pointer}>
        <GripVertical size={16} className="ocr-grip" aria-hidden="true" />
        {/* The title shows only for a moment when the panel opens, then leaves the room to the search box. */}
        <h2 id="ocr-panel-title" className="ocr-panel-title">AI 용어 분석</h2>
        <div ref={setSearchSlot} className="ocr-header-search" />
        <button type="button" className="ocr-switch" role="switch" aria-checked={marksOn} aria-label="화면에 찾은 용어 표시"
          title={`캡처한 곳에 찾은 용어 표시 · ${marksOn ? '켜짐' : '꺼짐'}`} onClick={() => setMarksOn((on) => !on)}><Highlighter size={15} aria-hidden="true" /></button>
        <button ref={closeButton} type="button" className="ocr-icon-button" aria-label="용어 분석 닫기" onClick={close}><X size={18} aria-hidden="true" /></button>
      </header>
      <PanelBoundary><Suspense fallback={<p className="ocr-note" role="status">분석 도구를 불러오고 있습니다…</p>}>
        <AnalysisPanel onCaptureVisibility={hideForCapture} showMarks={marksOn} searchSlot={searchSlot} />
      </Suspense></PanelBoundary>
      {!mobile && EDGES.map((edge) => <span key={edge} className={`ocr-resize ocr-resize-${edge}`} aria-hidden="true" data-drag={edge} {...pointer} />)}
    </aside>}
  </div>, document.body);
}
