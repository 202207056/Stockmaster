import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import CompanyFacts from './CompanyFacts';
import TermCard from '../../learn/TermCard';

const POP_WIDTH = 288;
const POP_HEIGHT = 150;
// The word's box, but only while the word itself is what is drawn there: words scrolled under a sticky
// header, clipped by a scroll box or covered by the analysis panel are not marked.
function visibleRect(range) {
  const rect = [...range.getClientRects()].find((box) => box.width > 0 && box.height > 0);
  if (!rect) return null;
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return null;
  const hit = document.elementsFromPoint(x, y).find((element) => !element.closest('.ocr-page-marks'));
  return hit?.contains(range.startContainer) ? rect : null;
}

function popPlace(rect) {
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - POP_WIDTH - 8));
  return rect.bottom + 6 + POP_HEIGHT > window.innerHeight
    ? { left, bottom: window.innerHeight - rect.top + 6, maxHeight: Math.max(0, rect.top - 14) }
    : { left, top: rect.bottom + 6, maxHeight: Math.max(0, window.innerHeight - rect.bottom - 14) };
}

// Highlights the found words right where they were captured on the page; pressing one opens its
// meaning beside it. Ranges are live, so the boxes are re-measured whenever the page scrolls or resizes.
export default function PageMarks({ marks, scan, active, onPick, describe }) {
  const [, setFrame] = useState(0);
  const [opened, setOpened] = useState(null);

  useEffect(() => {
    let frame = 0;
    const update = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; setFrame((n) => n + 1); }); };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, []);

  // A word picked in the panel that is off screen is scrolled into view so its box can be seen.
  useEffect(() => {
    const same = marks.filter((mark) => mark.id === active);
    if (!same.length || same.some((mark) => visibleRect(mark.range))) return;
    same[0].range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active, marks]);

  const shown = marks.map((mark) => ({ mark, rect: visibleRect(mark.range) })).filter(({ rect }) => rect);
  const open = shown.find(({ mark }) => mark.key === opened && mark.id === active);
  const info = open && describe(open.mark.id);
  const press = (mark) => {
    // Another copy of the word that is already open only moves the bubble; the same copy closes it.
    if (mark.id === active && mark.key !== opened) { setOpened(mark.key); return; }
    setOpened(mark.key); onPick(mark.id);
  };

  return createPortal(<div className="ocr-page-marks" data-ocr-widget>
    {scan && <div key={scan.key} className={`ocr-page-scan is-${scan.kind}`} aria-hidden="true" style={{
      left: scan.area.left, top: scan.area.top, width: scan.area.right - scan.area.left, height: scan.area.bottom - scan.area.top,
    }}><span /></div>}
    {shown.map(({ mark, rect }) => <button type="button" key={mark.key}
      className={`ocr-page-mark is-${mark.tier}${mark.ai ? ' is-ai' : ''}${mark.basic ? ' is-basic' : ''}${mark.id === active ? ' is-active' : ''}`} aria-pressed={mark.id === active && mark.key === opened}
      aria-label={`${mark.range.toString()} 뜻 보기`} onClick={() => press(mark)}
      style={{ left: rect.left - 2, top: rect.top - 1, width: rect.width + 4, height: rect.height + 2, '--i': mark.order }} />)}
    {info && <div className="ocr-page-pop" role="dialog" aria-label={`${info.term} 뜻`} style={popPlace(open.rect)}>
      <div className="ocr-page-pop-head"><span>{info.label}</span>
        <button type="button" aria-label="뜻 닫기" onClick={() => onPick(open.mark.id)}><X size={14} aria-hidden="true" /></button></div>
      <TermCard term={info.entry ?? { term: info.term, desc: info.text }} beforeDescription={<CompanyFacts term={info.ai} />}>
        {info.code && <Link className="relative z-10 mt-3 text-xs font-medium text-brand-600" to={`/trading?code=${encodeURIComponent(info.code)}`}>종목 보기 · {info.code} →</Link>}
      </TermCard>
    </div>}
  </div>, document.body);
}
