import { validateDetected } from './readMarks.js';

// The last analysis, kept for this browser tab only, so moving to another screen or closing the
// panel does not lose it. It is tied to the signed-in session and cleared when the tab closes.
const KEY = 'stockmaster:term-analyzer-last';
const MAX_TEXT = 3000;
const TABS = new Set(['invest', 'company', 'general']);
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

// A short fingerprint of the login token: another account or a new login does not see the old result.
export function ownerOf(token) {
  if (!token) return 'guest';
  let hash = 5381;
  for (const char of token) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}

function validCapture(capture) {
  const area = capture?.area;
  return capture && ['page', 'region'].includes(capture.kind) && typeof capture.path === 'string'
    && finite(capture.scrollX) && finite(capture.scrollY) && area
    && ['left', 'top', 'right', 'bottom'].every((side) => finite(area[side]));
}

export function readLast(owner, glossary, storage = globalThis.sessionStorage) {
  try {
    const saved = JSON.parse(storage.getItem(KEY));
    if (!saved || saved.owner !== owner || !finite(saved.at) || !['page', 'region'].includes(saved.source)) return null;
    return {
      at: saved.at,
      source: saved.source,
      text: typeof saved.text === 'string' ? saved.text.slice(0, MAX_TEXT) : '',
      pageTerms: Array.isArray(saved.pageTerms) ? saved.pageTerms.filter((id) => typeof id === 'string' && glossary[id]) : [],
      terms: validateDetected({ terms: saved.terms }),
      tab: TABS.has(saved.tab) ? saved.tab : 'invest',
      capture: validCapture(saved.capture) ? { ...saved.capture, fresh: false } : null,
    };
  } catch {
    return null;
  }
}

export function writeLast(owner, value, storage = globalThis.sessionStorage) {
  try {
    const { capture } = value;
    storage.setItem(KEY, JSON.stringify({
      owner, at: value.at, source: value.source, text: value.text.slice(0, MAX_TEXT), pageTerms: value.pageTerms, tab: value.tab,
      terms: value.terms.map(({ term, tier, meaning, basic, code, basis, facts }) => ({ term, tier, meaning, basic, symbol_code: code, basis,
        ...(facts && { listing: facts.listing, index: facts.index, sector: facts.sector, size: facts.size, group: facts.group, parent: facts.parent,
          listing_checked: facts.checked }) })),
      capture: capture && { kind: capture.kind, path: capture.path, area: capture.area, scrollX: capture.scrollX, scrollY: capture.scrollY },
    }));
  } catch { /* Storage is optional. */ }
}

export function clearLast(storage = globalThis.sessionStorage) {
  try { storage.removeItem(KEY); } catch { /* Storage is optional. */ }
}

export const savedTime = (at) => new Date(at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
