import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, X } from 'lucide-react';

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
  dimBackdrop = true,
}) {
  const panelRef = useRef(null);
  const lastFocused = useRef(null);
  const gesture = useRef(null);
  const offset = useRef({ x: 0, y: 0 });

  const movePanel = useCallback((dx, dy) => {
    const panel = panelRef.current;
    if (!panel) return;
    offset.current = { x: offset.current.x + dx, y: offset.current.y + dy };
    panel.style.transform = `translate(${offset.current.x}px, ${offset.current.y}px)`;
  }, []);

  useLayoutEffect(() => {
    if (!open || !draggable) return;
    offset.current = { x: 0, y: 0 };
    panelRef.current.style.transform = '';
    return () => {
      gesture.current = null;
    };
  }, [open, draggable]);

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
        style={dimBackdrop ? undefined : { boxShadow: '0 0 28px 6px rgb(15 23 42 / 22%)' }}
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
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 text-sm leading-relaxed text-gray-700 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 px-4 py-4 sm:px-6">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
