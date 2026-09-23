import { MousePointer2 } from 'lucide-react';
import { useContext, useId, useLayoutEffect, useRef } from 'react';
import { TutorialInstruction, TutorialRunning } from './tutorial-context';

export default function TutorialTarget({ active: requested = true, children, instruction }) {
  const running = useContext(TutorialRunning);
  const active = requested && running;
  const context = useContext(TutorialInstruction);
  const note = instruction || context;
  const noteId = useId();
  const targetRef = useRef(null);
  const noteRef = useRef(null);
  useLayoutEffect(() => {
    if (!active || !note) return;
    const target = targetRef.current;
    const popup = noteRef.current;
    const position = () => {
      const rect = target.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      const margin = 12;
      const gap = 18;
      popup.style.width = `${Math.min(300, width - margin * 2)}px`;
      popup.style.maxHeight = `${Math.max(80, height - margin * 2)}px`;
      const box = popup.getBoundingClientRect();
      let left;
      let top;
      if (rect.right + gap + box.width <= width - margin) {
        left = rect.right + gap;
        top = rect.top;
      } else if (rect.left - gap - box.width >= margin) {
        left = rect.left - gap - box.width;
        top = rect.top;
      } else {
        left = Math.max(margin, Math.min(rect.left, width - box.width - margin));
        const below = height - rect.bottom - gap - margin;
        const above = rect.top - gap - margin;
        const useBelow = below >= box.height || below >= above;
        popup.style.maxHeight = `${Math.max(80, useBelow ? below : above)}px`;
        top = useBelow ? rect.bottom + gap : rect.top - gap - popup.getBoundingClientRect().height;
      }
      popup.style.left = `${left}px`;
      popup.style.top = `${Math.max(margin, Math.min(top, height - popup.getBoundingClientRect().height - margin))}px`;
      popup.style.visibility = rect.bottom > 0 && rect.top < height ? 'visible' : 'hidden';
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(target);
    observer.observe(popup);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [active, note]);
  return <div className="tutorial-anchor" role={active && note ? 'group' : undefined} aria-describedby={active && note ? noteId : undefined}>
    <div ref={targetRef} tabIndex={active ? -1 : undefined} className={`tutorial-target ${active ? 'tutorial-target-active' : ''}`}>
    {children}
    {active && <span className="tutorial-pointer" aria-hidden="true"><MousePointer2 size={24} fill="white" /><span>여기를 클릭</span></span>}
    </div>
    {active && note && <div ref={noteRef} id={noteId} className="tutorial-local-note" role="status" aria-live="polite" aria-atomic="true"><strong className="block text-sm text-brand-700">{note.title}</strong><p className="mt-1 text-sm leading-relaxed text-gray-600">{note.text}</p></div>}
  </div>;
}
