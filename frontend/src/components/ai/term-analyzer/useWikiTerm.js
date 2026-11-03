import { useCallback, useEffect, useRef, useState } from 'react';
import { WIKI_ENABLED, wikiLookup, validateWikiTerm } from './wikiLookup.js';

export default function useWikiTerm({ setSelected, setAiTarget, ocrJob }) {
  const [result, setResult] = useState(null);
  const job = useRef(null), sequence = useRef(0), word = useRef('');
  const clear = useCallback(() => {
    sequence.current++; job.current?.abort(); job.current = null; word.current = ''; setResult(null);
  }, []);
  const lookup = useCallback(async (value) => {
    if (!WIKI_ENABLED || ocrJob.current) return;
    const safeTerm = validateWikiTerm(value);
    if (job.current && safeTerm?.toUpperCase() === word.current) return;
    clear(); setSelected(null); setAiTarget(null);
    const current = sequence.current, controller = new AbortController(); job.current = controller;
    word.current = safeTerm?.toUpperCase() ?? '';
    setResult(safeTerm ? { status: 'loading', term: safeTerm } : { status: 'invalid_input' });
    try {
      const found = await wikiLookup.lookup(value, { signal: controller.signal });
      if (controller.signal.aborted || current !== sequence.current) return;
      if (found.status === 'local') { setResult(null); setSelected(found.glossaryId); }
      else setResult(found);
    } catch (failure) {
      if (failure?.name !== 'AbortError' && current === sequence.current) setResult({ status: 'unavailable' });
    } finally { if (job.current === controller) { job.current = null; word.current = ''; } }
  }, [clear, ocrJob, setSelected, setAiTarget]);
  const cancel = useCallback(() => {
    sequence.current++; job.current?.abort(); job.current = null; word.current = ''; setResult({ status: 'cancelled' });
  }, []);
  const chooseCandidate = useCallback((title) => {
    const candidate = result?.status === 'ambiguous' && result.candidates?.find(item => item.title === title && item.status === 'found');
    if (candidate) setResult(candidate); // Already validated in the same lookup; no new request.
  }, [result]);
  useEffect(() => () => { job.current?.abort(); }, []);
  return { result, lookup, clear, cancel, chooseCandidate };
}
