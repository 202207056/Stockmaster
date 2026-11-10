import { GLOSSARY } from '../../../constants/glossary.js';
import { validateDetected } from './readMarks.js';

// Words the user searched in the panel, newest first. Kept in this browser per account so they can be
// opened again later without another AI call; the oldest fall off once the list is full.
export const MAX_HISTORY = 20;
const keyFor = (user) => `stockmaster:term-search-history:${user}`;

function toStored(item) {
  const { term, kind, id, detail, at } = item;
  if (kind === 'dictionary') return { term, kind, id, at };
  const { facts, code, ...rest } = detail;
  return { term, kind, at, detail: { ...rest, symbol_code: code, ...(facts && { ...facts, listing_checked: facts.checked }) } };
}

export function readHistory(user, glossary = GLOSSARY, storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(keyFor(user)));
    if (!Array.isArray(saved)) return [];
    return saved.flatMap((item) => {
      if (!item || typeof item.term !== 'string' || !item.term.trim() || item.term.length > 60 || !Number.isFinite(item.at)) return [];
      if (item.kind === 'dictionary') return glossary[item.id] ? [{ term: item.term, kind: 'dictionary', id: item.id, at: item.at }] : [];
      const [detail] = item.kind === 'ai' ? validateDetected({ terms: [item.detail] }) : [];
      return detail ? [{ term: item.term, kind: 'ai', detail, at: item.at }] : [];
    }).slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function write(user, list, storage) {
  try { storage.setItem(keyFor(user), JSON.stringify(list.map(toStored))); } catch { /* Storage is optional. */ }
}

// A word searched again moves to the top instead of appearing twice.
export function addHistory(user, list, item, storage = globalThis.localStorage) {
  const next = [item, ...list.filter((old) => old.term !== item.term)].slice(0, MAX_HISTORY);
  write(user, next, storage);
  return next;
}

export function removeHistory(user, list, term, storage = globalThis.localStorage) {
  const next = list.filter((old) => old.term !== term);
  write(user, next, storage);
  return next;
}
