import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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
}) {
  const panelRef = useRef(null);
  const lastFocused = useRef(null);

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

  const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={`relative z-10 w-full ${sizeClass} rounded-xl bg-white shadow-xl outline-none`}
      >
        {title && (
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="-mt-1 -mr-2 rounded p-1 text-xl leading-none text-gray-400 transition hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-6 py-5 text-sm leading-relaxed text-gray-700">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
