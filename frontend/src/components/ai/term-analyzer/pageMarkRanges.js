import { findTermSpans } from './terms.js';
import { aiId, BASIC_IDS } from './readMarks.js';

const MAX_MARKS = 80;
const SKIPPED = '[data-ocr-widget], script, style, noscript, textarea, input, select, [aria-hidden="true"]';
const overlaps = (rect, area) => rect.width > 0 && rect.height > 0
  && rect.left < area.right && rect.right > area.left && rect.top < area.bottom && rect.bottom > area.top;

// The whole page, for marks after a full-page analysis.
export const WHOLE_PAGE = { left: -1e7, top: -1e7, right: 1e7, bottom: 1e7 };

// The captured rectangle moved by however far the window has scrolled since the capture.
export function shiftArea(capture, scrollX, scrollY) {
  const dx = capture.scrollX - scrollX, dy = capture.scrollY - scrollY;
  const { area } = capture;
  return { left: area.left + dx, right: area.right + dx, top: area.top + dy, bottom: area.bottom + dy };
}

// The text normalized one character at a time, with each normalized position's place in the original.
function normalizedWithOrigin(text) {
  let source = '';
  const origin = [];
  for (let at = 0; at < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(at));
    const normal = char.normalize('NFKC').toUpperCase();
    for (let unit = 0; unit < normal.length; unit += 1) origin.push(at);
    source += normal;
    at += char.length;
  }
  origin.push(text.length);
  return { source, origin };
}

// Finds every dictionary term and AI word drawn inside the area as live DOM ranges, so they can be
// highlighted in place on the page. Words split across elements or drawn inside pictures are not found.
export function collectPageMarks(area, glossary, aiTerms, root = document.body, limit = MAX_MARKS) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const marks = [];
  let index = -1;
  for (let node = walker.nextNode(); node && marks.length < limit; node = walker.nextNode()) {
    const text = node.data;
    index += 1;
    if (!text.trim() || !node.parentElement || node.parentElement.closest(SKIPPED)) continue;
    const whole = doc.createRange(); whole.selectNodeContents(node);
    if (![...whole.getClientRects()].some((rect) => overlaps(rect, area))) continue;
    // Dictionary offsets are measured on the normalized text ("…" becomes "..."), so map them back.
    const { source, origin } = normalizedWithOrigin(text);
    const found = findTermSpans(source, glossary).map((span) => ({
      ...span, start: origin[span.start], end: origin[span.end], tier: 'invest', basic: BASIC_IDS.has(span.id),
    }));
    // Every place an AI word appears is marked, longest words first so a full name wins over its part.
    [...aiTerms].sort((a, b) => b.term.length - a.term.length).forEach((term) => {
      for (let start = text.indexOf(term.term); start >= 0; start = text.indexOf(term.term, start + term.term.length)) {
        const end = start + term.term.length;
        if (found.some((span) => start < span.end && end > span.start)) continue;
        found.push({ id: aiId(term), start, end, tier: term.tier, ai: true, basic: !!term.basic });
      }
    });
    for (const span of found.sort((a, b) => a.start - b.start)) {
      const range = doc.createRange(); range.setStart(node, span.start); range.setEnd(node, span.end);
      if (![...range.getClientRects()].some((rect) => overlaps(rect, area))) continue;
      // Keys follow the text position, so marks added when the AI answers do not replay the others.
      marks.push({ ...span, range, key: `${span.id}@${index}:${span.start}` });
      if (marks.length === limit) break;
    }
  }
  let dictionary = 0, ai = 0;
  return marks.map((mark) => ({ ...mark, order: mark.ai ? ai++ : dictionary++ }));
}

// One box per line the word sits on, so a word wrapped onto the next line is marked in full.
export function lineBoxes(range) {
  const lines = [];
  for (const box of range.getClientRects()) {
    if (box.width <= 0 || box.height <= 0) continue;
    const line = lines.find((rect) => Math.abs(rect.top - box.top) < 2);
    if (!line) { lines.push({ left: box.left, top: box.top, right: box.right, bottom: box.bottom }); continue; }
    line.left = Math.min(line.left, box.left); line.right = Math.max(line.right, box.right); line.bottom = Math.max(line.bottom, box.bottom);
  }
  return lines.map((rect) => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top }));
}
