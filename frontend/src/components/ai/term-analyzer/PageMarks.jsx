import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import CompanyFacts from './CompanyFacts';
import { lineBoxes } from './pageMarkRanges';

const POP_WIDTH = 260;
const POP_HEIGHT = 150;
// The word's boxes, but only where the word itself is what is drawn there: words scrolled under a sticky
// header, clipped by a scroll box or covered by the analysis panel are not marked.
function visibleRects(range) {
  return lineBoxes(range).filter((rect) => {
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
    const hit = document.elementsFromPoint(x, y).find((element) => !element.closest('.ocr-page-marks'));
    return !!hit && (hit.contains(range.startContainer) || hit.contains(range.endContainer) || range.intersectsNode(hit));
  });
}

function popPlace(rect) {
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - POP_WIDTH - 8));
  return rect.bottom + 6 + POP_HEIGHT > window.innerHeight
    ? { left, bottom: window.innerHeight - rect.top + 6 } : { left, top: rect.bottom + 6 };
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
    if (!same.length || same.some((mark) => visibleRects(mark.range).length)) return;
    same[0].range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active, marks]);

  const shown = marks.map((mark) => ({ mark, rects: visibleRects(mark.range) })).filter(({ rects }) => rects.length)
    .map((item) => ({ ...item, rect: item.rects[0] }));
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
    {shown.flatMap(({ mark, rects }) => rects.map((rect, part) => <button type="button" key={`${mark.key}:${part}`}
      className={`ocr-page-mark is-${mark.tier}${mark.ai ? ' is-ai' : ''}${mark.basic ? ' is-basic' : ''}${mark.id === active ? ' is-active' : ''}${rects.length > 1 ? ' is-split' : ''}`}
      aria-pressed={mark.id === active && mark.key === opened} aria-hidden={part > 0 || undefined} tabIndex={part > 0 ? -1 : undefined}
      aria-label={`${mark.range.toString().replace(/\s+/gu, '')} 뜻 보기`} onClick={() => press(mark)}
      style={{ left: rect.left - 2, top: rect.top - 1, width: rect.width + 4, height: rect.height + 2, '--i': mark.order }} />))}
    {info && <div className="ocr-page-pop" role="dialog" aria-label={`${info.term} 뜻`} style={popPlace(open.rect)}>
      <div className="ocr-page-pop-head"><span>{info.label}</span>
        <button type="button" aria-label="뜻 닫기" onClick={() => onPick(open.mark.id)}><X size={14} aria-hidden="true" /></button></div>
      <strong>{info.term}</strong>
      <CompanyFacts term={info.ai} />
      <p>{info.text}</p>
      {info.code && <Link className="ocr-page-pop-link" to={`/trading?code=${encodeURIComponent(info.code)}`}>종목 보기 · {info.code}</Link>}
    </div>}
  </div>, document.body);
}
