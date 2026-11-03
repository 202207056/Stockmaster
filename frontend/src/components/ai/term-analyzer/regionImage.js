// Pictures inside a selected area, redrawn onto one canvas for the local OCR engine.
// Images from other sites cannot be read by the page, so they are skipped and counted.
const MIN_AREA = 1600;
const SCALE = 2;

export function overlap(rect, area) {
  const left = Math.max(rect.left, area.left), top = Math.max(rect.top, area.top);
  const right = Math.min(rect.right, area.right), bottom = Math.min(rect.bottom, area.bottom);
  return right > left && bottom > top ? { left, top, right, bottom } : null;
}

// Maps the visible part of an element back to its own pixels.
export function sourceRect(part, rect, naturalWidth, naturalHeight) {
  const sx = naturalWidth / rect.width, sy = naturalHeight / rect.height;
  return { x: (part.left - rect.left) * sx, y: (part.top - rect.top) * sy, w: (part.right - part.left) * sx, h: (part.bottom - part.top) * sy };
}

function readable(element) {
  try {
    const probe = document.createElement('canvas'); probe.width = 1; probe.height = 1;
    const context = probe.getContext('2d');
    context.drawImage(element, 0, 0, 1, 1);
    context.getImageData(0, 0, 1, 1);
    return true;
  } catch { return false; }
}

export async function renderRegionImages(area, signal, root = document) {
  const pieces = [];
  let skipped = 0;
  for (const element of root.querySelectorAll('img, canvas')) {
    if (element.closest('[data-ocr-widget]')) continue;
    const rect = element.getBoundingClientRect();
    const part = overlap(rect, area);
    if (!part || (part.right - part.left) * (part.bottom - part.top) < MIN_AREA) continue;
    const width = element.naturalWidth ?? element.width, height = element.naturalHeight ?? element.height;
    if (!width || !height || (element.tagName === 'IMG' && !element.complete)) continue;
    if (!readable(element)) { skipped += 1; continue; }
    pieces.push({ element, part, source: sourceRect(part, rect, width, height) });
  }
  signal?.throwIfAborted();
  if (!pieces.length) return { blob: null, count: 0, skipped };
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((area.right - area.left) * SCALE); canvas.height = Math.ceil((area.bottom - area.top) * SCALE);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  for (const { element, part, source } of pieces) {
    context.drawImage(element, source.x, source.y, source.w, source.h,
      (part.left - area.left) * SCALE, (part.top - area.top) * SCALE, (part.right - part.left) * SCALE, (part.bottom - part.top) * SCALE);
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  signal?.throwIfAborted();
  return { blob, count: pieces.length, skipped };
}
