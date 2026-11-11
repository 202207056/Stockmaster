import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const MIN_SIZE = 8;
const FLASH_MS = 200;
const box = (start, end) => ({
  left: Math.min(start.x, end.x), top: Math.min(start.y, end.y),
  right: Math.max(start.x, end.x), bottom: Math.max(start.y, end.y),
});

// A drag-to-select layer over the page, like the system snipping tool but without any permission prompt.
// The dimmed frame is four plain rectangles moved once per animation frame, so dragging stays smooth
// in browsers that repaint large shadows slowly.
export default function RegionSelector({ onSelect, onCancel }) {
  const layer = useRef(null);
  const shades = useRef([]);
  const frame = useRef(null);
  const start = useRef(null);
  const pending = useRef(null);
  const tick = useRef(0);
  const flash = useRef(0);

  useEffect(() => {
    layer.current?.focus({ preventScroll: true });
    const escape = (event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('keydown', escape, true); cancelAnimationFrame(tick.current); clearTimeout(flash.current); };
  }, [onCancel]);

  const draw = () => {
    tick.current = 0;
    const area = pending.current;
    const [top, bottom, left, right] = shades.current;
    const width = window.innerWidth, height = window.innerHeight;
    if (!area || !top) return;
    const place = (element, x, y, w, h) => { element.style.transform = `translate(${x}px, ${y}px)`; element.style.width = `${Math.max(0, w)}px`; element.style.height = `${Math.max(0, h)}px`; };
    place(top, 0, 0, width, area.top);
    place(bottom, 0, area.bottom, width, height - area.bottom);
    place(left, 0, area.top, area.left, area.bottom - area.top);
    place(right, area.right, area.top, width - area.right, area.bottom - area.top);
    place(frame.current, area.left, area.top, area.right - area.left, area.bottom - area.top);
  };
  const schedule = (area) => {
    pending.current = area;
    if (!tick.current) tick.current = requestAnimationFrame(draw);
  };

  const down = (event) => {
    if (event.button === 2) { onCancel(); return; }
    if (event.button !== 0) return;
    event.preventDefault();
    start.current = { x: event.clientX, y: event.clientY };
    layer.current.classList.add('is-dragging');
    schedule(box(start.current, start.current));
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event) => { if (start.current) schedule(box(start.current, { x: event.clientX, y: event.clientY })); };
  const up = (event) => {
    if (!start.current) return;
    const selected = box(start.current, { x: event.clientX, y: event.clientY });
    start.current = null;
    if (selected.right - selected.left < MIN_SIZE || selected.bottom - selected.top < MIN_SIZE) {
      layer.current.classList.remove('is-dragging');
      return;
    }
    // A short white flash, like a shutter, before the overlay leaves and the reading starts.
    layer.current.classList.add('is-captured');
    flash.current = setTimeout(() => onSelect(selected), FLASH_MS);
  };

  return createPortal(<div ref={layer} className="ocr-region" data-ocr-widget tabIndex={-1}
    aria-label="분석할 영역 선택. 드래그해서 고르고 Esc 또는 취소 버튼으로 취소해요." onPointerDown={down} onPointerMove={move} onPointerUp={up}
    onContextMenu={(event) => event.preventDefault()}>
    {[0, 1, 2, 3].map((index) => <div key={index} ref={(element) => { shades.current[index] = element; }} className="ocr-region-shade" />)}
    <div ref={frame} className="ocr-region-box" />
    <p className="ocr-region-hint">드래그해서 분석할 영역을 선택하세요 · <kbd>Esc</kbd><button type="button" className="ocr-region-cancel" onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onClick={onCancel}>취소</button></p>
  </div>, document.body);
}
