import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** One mounted form: closing the sheet retains the draft and automation settings. */
export default function MobileTradingSheet({ enabled, open, onClose, title, busy = false, children }) {
  const panel = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!enabled || !open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const app = document.getElementById('root');
    const wasInert = app?.inert;
    if (app) app.inert = true;
    document.body.style.overflow = 'hidden';
    panel.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = overflow; if (app) app.inert = wasInert; if (previous?.isConnected) previous.focus?.({ preventScroll: true }); };
  }, [enabled, open]);
  if (!enabled) return children;
  return createPortal(<div hidden={!open} className="mobile-trading-sheet-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={panel} className="mobile-trading-sheet" role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-labelledby={titleId} tabIndex={-1}
      onKeyDown={event => {
        // Native order confirmation and tutorial dialogs own their keyboard input.
        if (document.querySelector('dialog[open]') || event.defaultPrevented) return;
        if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onClose(); }
        if (event.key === 'Tab') {
          const items = [...panel.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')].filter(el => el.getClientRects().length);
          const first = items[0], last = items.at(-1);
          if (!items.length) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}>
      <header className="mobile-trading-sheet-heading"><h2 id={titleId}>{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="주문·종목 창 닫기"><X size={22} aria-hidden="true" /></button></header>
      <div className="mobile-trading-sheet-content">{children}</div>
    </section>
  </div>, document.body);
}
