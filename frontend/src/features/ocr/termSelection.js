import { useEffect, useState } from 'react';
import { validateWikiTerm } from './wikiLookup.js';

// Existing Stockmaster news scopes only: no account tables, inputs or other tabs.
const newsScope = '[data-site-tour="news"],section[aria-label="선택 종목 AI 뉴스 요약"]';
const privateScope = '[data-ocr-widget],.ocr-widget,input,textarea,select,script,style,[contenteditable]:not([contenteditable="false"]),[hidden],[inert],[aria-hidden="true"]';
const elementOf = node => node?.nodeType === 1 ? node : node?.parentElement;

export function selectedNewsTerm(doc, selection = doc.defaultView.getSelection()) {
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return '';
  const range = selection.getRangeAt(0), start = elementOf(range.startContainer), end = elementOf(range.endContainer);
  if (!start || !end || start.ownerDocument !== doc || end.ownerDocument !== doc || start.closest(privateScope) || end.closest(privateScope)) return '';
  const scope = start.closest(newsScope);
  if (!scope || end.closest(newsScope) !== scope || !doc.getElementById('root')?.contains(scope)) return '';
  return validateWikiTerm(selection.toString()) ?? '';
}

export function useNewsTermSelection(enabled) {
  const [term, setTerm] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const capture = () => {
      const selection = document.getSelection();
      // Keep the bounded selected word when clicking the analysis button collapses
      // the selection. A new nonempty selection replaces it, including rejection.
      if (!selection?.isCollapsed) setTerm(selectedNewsTerm(document, selection));
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [enabled]);
  return term;
}
