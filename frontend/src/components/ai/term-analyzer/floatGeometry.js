// Where the round button and the panel sit. Both share one anchor: the distance from the nearest
// left/right and top/bottom edges, so the panel opens from the button's corner and the button
// comes back to that corner when the panel closes, and a smaller window pulls both back inside.
export const MARGIN = 8;
export const BUTTON = { w: 56, h: 56 };
export const MIN_PANEL = { w: 300, h: 240 };
export const DEFAULT_PANEL = { w: 380, h: 560 };
export const DEFAULT_ANCHOR = { h: 'right', dx: 24, v: 'bottom', dy: 24 };

const within = (value, low, high) => Math.max(low, Math.min(value, high));

export function clampRect(rect, view) {
  const w = Math.min(rect.w, view.width - MARGIN * 2);
  const h = Math.min(rect.h, view.height - MARGIN * 2);
  return {
    x: Math.round(within(rect.x, MARGIN, view.width - w - MARGIN)),
    y: Math.round(within(rect.y, MARGIN, view.height - h - MARGIN)),
    w: Math.round(w), h: Math.round(h),
  };
}

export function anchorFromRect(rect, view) {
  const h = rect.x + rect.w / 2 < view.width / 2 ? 'left' : 'right';
  const v = rect.y + rect.h / 2 < view.height / 2 ? 'top' : 'bottom';
  return {
    h, dx: Math.round(h === 'left' ? rect.x : view.width - rect.x - rect.w),
    v, dy: Math.round(v === 'top' ? rect.y : view.height - rect.y - rect.h),
  };
}

export function rectFromAnchor(anchor, size, view) {
  const x = anchor.h === 'left' ? anchor.dx : view.width - anchor.dx - size.w;
  const y = anchor.v === 'top' ? anchor.dy : view.height - anchor.dy - size.h;
  return clampRect({ x, y, w: size.w, h: size.h }, view);
}

// edge is any of n/s/e/w or a corner like "se"; the opposite edges stay put.
export function resizeRect(start, edge, dx, dy, view) {
  let { x, y, w, h } = start;
  const right = x + w; const bottom = y + h;
  if (edge.includes('e')) w = within(w + dx, MIN_PANEL.w, view.width - MARGIN - x);
  if (edge.includes('s')) h = within(h + dy, MIN_PANEL.h, view.height - MARGIN - y);
  if (edge.includes('w')) { x = within(x + dx, MARGIN, right - MIN_PANEL.w); w = right - x; }
  if (edge.includes('n')) { y = within(y + dy, MARGIN, bottom - MIN_PANEL.h); h = bottom - y; }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

export function readJson(key, valid) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return valid(value) ? value : null;
  } catch { return null; }
}

export function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Position memory is optional. */ }
}

export const validAnchor = (value) => ['left', 'right'].includes(value?.h) && ['top', 'bottom'].includes(value?.v)
  && Number.isFinite(value.dx) && Number.isFinite(value.dy);
export const validSize = (value) => Number.isFinite(value?.w) && Number.isFinite(value?.h);
