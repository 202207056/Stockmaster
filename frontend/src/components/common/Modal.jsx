import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, MoveDiagonal2, X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * 모달 (F-8)
 *
 * 접근성 처리를 직접 넣은 부분:
 *  - ESC 로 닫기
 *  - 열려 있는 동안 body 스크롤 잠금
 *  - 열릴 때 패널로 포커스 이동, 닫힐 때 원래 요소로 복귀
 *  - Tab 이 모달 밖으로 빠져나가지 않도록 순환
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  draggable = false,
  resizable = false,
  dimBackdrop = true,
}) {
  const panelRef = useRef(null);
  const lastFocused = useRef(null);
  const gesture = useRef(null);
  const resizeGesture = useRef(null);
  const offset = useRef({ x: 0, y: 0 });

  const movePanel = useCallback((dx, dy) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const width = window.innerWidth;
    const height = Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight);
    const x = Math.max(8, Math.min(rect.left + dx, width - rect.width - 8));
    const y = Math.max(8, Math.min(rect.top + dy, height - rect.height - 8));
    offset.current = { x: offset.current.x + x - rect.left, y: offset.current.y + y - rect.top };
    panel.style.transform = `translate(${offset.current.x}px, ${offset.current.y}px)`;
  }, []);

  useLayoutEffect(() => {
    if (!open || !draggable) return;
    offset.current = { x: 0, y: 0 };
    panelRef.current.style.transform = '';
    const fit = () => movePanel(0, 0);
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      gesture.current = null;
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, [open, draggable, movePanel]);

  const startDrag = (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event) => {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    movePanel(event.clientX - drag.x, event.clientY - drag.y);
    gesture.current = { id: drag.id, x: event.clientX, y: event.clientY };
  };
  const endDrag = () => { gesture.current = null; };

  const resizePanel = (dx, dy, corner) => {
    const panel = panelRef.current;
    if (!panel) return;
    const { width, height } = panel.getBoundingClientRect();
    const horizontal = corner.includes('w') ? -1 : 1;
    const vertical = corner.includes('n') ? -1 : 1;
    const nextWidth = Math.max(Math.min(360, window.innerWidth - 32), Math.min(window.innerWidth - 32, width + dx * horizontal));
    const nextHeight = Math.max(Math.min(240, window.innerHeight - 32), Math.min(window.innerHeight - 32, height + dy * vertical));
    panel.style.width = `${nextWidth}px`;
    panel.style.height = `${nextHeight}px`;
    // Compensate for flex centering so the opposite corner stays fixed.
    movePanel(horizontal * (nextWidth - width) / 2, vertical * (nextHeight - height) / 2);
  };
  const endResize = () => { resizeGesture.current = null; };
  const startResize = event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    resizeGesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };
  const moveResize = event => {
    const resize = resizeGesture.current;
    if (!resize || resize.id !== event.pointerId) return;
    resizePanel(event.clientX - resize.x, event.clientY - resize.y, event.currentTarget.dataset.corner);
    resizeGesture.current = { id: resize.id, x: event.clientX, y: event.clientY };
  };
  const keyResize = event => {
    const steps = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    if (steps[event.key]) { event.preventDefault(); resizePanel(...steps[event.key], event.currentTarget.dataset.corner); }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return undefined;

    lastFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      if (lastFocused.current instanceof HTMLElement) lastFocused.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-7xl' }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className={`absolute inset-0 ${dimBackdrop ? 'bg-black/40' : 'bg-transparent'}`}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        style={{ ...(!dimBackdrop && { boxShadow: '0 0 28px 6px rgb(15 23 42 / 22%)' }),
          ...(resizable && { width: 'min(80rem, calc(100vw - 2rem))', maxWidth: 'calc(100vw - 2rem)', containerType: 'inline-size', transitionProperty: 'none' }) }}
        className={`relative z-10 flex max-h-[calc(100dvh-2rem)] min-w-0 w-full flex-col ${sizeClass} rounded-xl bg-white shadow-xl outline-none`}
      >
        {title && (
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
            {draggable ? <h2 className="min-w-0 flex-1 text-base font-bold text-gray-900">
              <button type="button" className="flex w-full touch-none select-none items-center gap-2 text-left cursor-grab active:cursor-grabbing"
                title="드래그 또는 방향키로 이동" aria-label={`${title} 팝업 이동`}
                onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
                onKeyDown={event => {
                  const steps = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
                  if (steps[event.key]) { event.preventDefault(); movePanel(...steps[event.key]); }
                }}>
                <GripVertical size={18} className="shrink-0 text-gray-400" aria-hidden="true" />{title}
              </button>
            </h2> : <h2 className="text-base font-bold text-gray-900">{title}</h2>}
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="-mt-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-gray-400 transition hover:text-gray-700"
            >
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className={`${resizable ? 'flex-1' : ''} min-h-0 overflow-y-auto overscroll-contain px-4 py-5 text-sm leading-relaxed text-gray-700 sm:px-6`}>{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 px-4 py-4 sm:px-6">{footer}</div>
        )}
        {resizable && [['nw', '왼쪽 위', { top: 0, left: 0 }], ['ne', '오른쪽 위', { top: 0, right: 0 }],
          ['sw', '왼쪽 아래', { bottom: 0, left: 0 }], ['se', '오른쪽 아래', { bottom: 0, right: 0 }]].map(([corner, label, position]) =>
          <button key={corner} type="button" aria-label={`${title} 창 ${label} 크기 조절`} title="드래그 또는 방향키로 창 크기 조절"
            style={{ ...position, cursor: `${corner}-resize` }}
            className="absolute z-20 flex h-6 w-6 touch-none select-none items-center justify-center rounded text-gray-400 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-brand-600"
            data-corner={corner} onPointerDown={startResize} onPointerMove={moveResize}
            onPointerUp={endResize} onPointerCancel={endResize} onLostPointerCapture={endResize}
            onKeyDown={keyResize}><MoveDiagonal2 size={14} className={corner === 'nw' || corner === 'se' ? 'rotate-90' : undefined} aria-hidden="true" /></button>
        )}
      </div>
    </div>,
    document.body,
  );
}
