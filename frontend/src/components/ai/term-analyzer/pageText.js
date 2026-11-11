// Local DOM snapshot only. This module has no API, OCR or persistence dependency.
const excluded = 'script,style,noscript,template,input,textarea,select,option,canvas,iframe,object,embed,video,audio,img,svg title,svg desc,[data-ocr-widget],.ocr-widget,[hidden],[inert],[aria-hidden="true"],[contenteditable]:not([contenteditable="false"]),.sr-only,.visually-hidden,dialog:not([open]),[role="tab"][aria-selected="false"],[role="tabpanel"][data-state="inactive"]';
const blockDisplay = /^(?:block|flex|grid|flow-root|list-item|table(?:-.*)?)$/u;
// Scrollable content is part of the page; genuinely clipped content stays hidden.
const clippedOverflow = /^(?:hidden|clip)$/u;
const scrollableOverflow = /^(?:scroll|auto)$/u;
const intersects = (rect, area) => rect.width > 0 && rect.height > 0
  && rect.right > area.left && rect.left < area.right && rect.bottom > area.top && rect.top < area.bottom;
const contained = (rect, area) => rect.left >= area.left && rect.right <= area.right && rect.top >= area.top && rect.bottom <= area.bottom;

// With a region, only text drawn inside that screen rectangle is read (the drag-to-select analysis).
export function readVisiblePageText(root = document.body, region = null) {
  const doc = root.ownerDocument, view = doc.defaultView;
  // "Visible" means rendered page content, including outside the current viewport.
  // Retain this export for existing consumers; never scroll or load missing rows.
  // Tabs can share one panel, so a panel the selected tab controls is on screen even when other tabs also name it.
  const controlled = (selected) => [...doc.querySelectorAll(`[role="tab"][aria-selected="${selected}"][aria-controls]`)]
    .flatMap((tab) => tab.getAttribute('aria-controls').trim().split(/\s+/u).filter(Boolean));
  const activePanels = new Set(controlled('true'));
  const inactivePanels = new Set(controlled('false').filter((id) => !activePanels.has(id)));
  const chunks = [], range = doc.createRange();

  function textInArea(node, area, style) {
    const raw = /^(?:pre|pre-wrap|pre-line|break-spaces)$/u.test(style.whiteSpace)
      ? node.data : node.data.replace(/\s+/gu, ' ');
    if (!area) return raw;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    if (!rects.some((rect) => intersects(rect, area))) return '';
    if (rects.every((rect) => contained(rect, area))) return raw;
    // Only actual overflow clipping needs character bounds, never viewport edges.
    // Keep gaps as line boundaries so clipped fragments cannot form a fake term.
    let text = '', offset = 0, gap = false;
    for (const char of node.data) {
      range.setStart(node, offset); offset += char.length; range.setEnd(node, offset);
      if ([...range.getClientRects()].some((rect) => intersects(rect, area))) {
        if (gap && text) text += '\n';
        text += char; gap = false;
      } else if (!/\s/u.test(char)) gap = true;
      else if (!gap) text += ' ';
    }
    return text;
  }

  function visit(element, parentArea) {
    if (element.matches(excluded) || inactivePanels.has(element.id)) return;
    if (element.getAttribute('role') === 'tabpanel' && (element.getAttribute('aria-labelledby') ?? '').split(/\s+/u)
      .some((id) => doc.getElementById(id)?.getAttribute('aria-selected') === 'false')) return;
    if (element.hasAttribute('popover')) {
      // Unsupported browsers cannot display a native popover.
      try { if (!element.matches(':popover-open')) return; } catch { return; }
    }
    const style = view.getComputedStyle(element);
    if (style.display === 'none' || style.contentVisibility === 'hidden' || Number.parseFloat(style.opacity) === 0
      || (style.clip && style.clip !== 'auto') || (style.clipPath && style.clipPath !== 'none')
      || (style.maskImage && style.maskImage !== 'none')) return;
    let area = parentArea;
    if (area && !region && (scrollableOverflow.test(style.overflowX) || scrollableOverflow.test(style.overflowY))) {
      // A rendered scroll container exposes its loaded contents, even inside a
      // clipped card. Keep wholly concealed containers excluded.
      if (!intersects(element.getBoundingClientRect(), area)) return;
      area = { ...area };
      if (scrollableOverflow.test(style.overflowX)) { area.left = -Infinity; area.right = Infinity; }
      if (scrollableOverflow.test(style.overflowY)) { area.top = -Infinity; area.bottom = Infinity; }
    }
    // html/body overflow governs the viewport; it must not trim a full-page scan.
    // In a region, a scroll box also hides whatever is scrolled out of its frame.
    const clips = region ? /^(?:hidden|clip|scroll|auto)$/u : clippedOverflow;
    if (element !== doc.body && element !== doc.documentElement
      && (clips.test(style.overflowX) || clips.test(style.overflowY))) {
      area = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity, ...parentArea };
      const bounds = element.getBoundingClientRect();
      if (clips.test(style.overflowX)) {
        area.left = Math.max(area.left, bounds.left + element.clientLeft);
        area.right = Math.min(area.right, bounds.left + element.clientLeft + element.clientWidth);
      }
      if (clips.test(style.overflowY)) {
        area.top = Math.max(area.top, bounds.top + element.clientTop);
        area.bottom = Math.min(area.bottom, bounds.top + element.clientTop + element.clientHeight);
      }
      if (area.left >= area.right || area.top >= area.bottom) return;
    }
    const block = blockDisplay.test(style.display) || element.tagName === 'BR';
    if (block) chunks.push('\n');
    const summary = element.tagName === 'DETAILS' && !element.hasAttribute('open')
      ? [...element.children].find((child) => child.tagName === 'SUMMARY') : null;
    for (const child of element.childNodes) {
      if (element.tagName === 'DETAILS' && !element.hasAttribute('open') && child !== summary) continue;
      if (child.nodeType === 1) visit(child, area);
      else if (child.nodeType === 3 && style.visibility !== 'hidden' && style.visibility !== 'collapse') chunks.push(textInArea(child, area, style));
    }
    if (block) chunks.push('\n');
  }
  visit(root, region);
  // Deduplicate whole lines, preserving inline text and compound-term boundaries.
  return [...new Set(chunks.join('').split('\n').map((line) => line.replace(/\s+/gu, ' ').trim()).filter(Boolean))].join('\n');
}
