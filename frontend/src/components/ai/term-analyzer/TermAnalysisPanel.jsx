import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { CATEGORIES, GLOSSARY } from '../../../constants/glossary';
import { exactGlossaryId, findDetectedTerms } from './terms';
import { recognizeLocal } from './ocr';
import PageMarks from './PageMarks';
import TermCard from '../../learn/TermCard';
import CompanyFacts from './CompanyFacts';
import { collectPageMarks, shiftArea, WHOLE_PAGE } from './pageMarkRanges';
import { clearLast, ownerOf, readLast, writeLast } from './lastAnalysis';
import { addHistory, readHistory, removeHistory } from './searchHistory';
import { detectTerms } from './termDetect';
import { Link, useLocation } from 'react-router-dom';
import { aiId, BASIC_IDS, TIER_LABELS } from './readMarks';
import RegionSelector from './RegionSelector';
import { renderRegionImages } from './regionImage';
import useAuth from '../../../hooks/useAuth';
import { getToken } from '../../../api/client';
import { readVisiblePageText } from './pageText';

const plainName = (id) => GLOSSARY[id].term.split(' (')[0].split(' · ')[0];
const TABS = { ...TIER_LABELS, history: '검색 기록' };

function revealDefinition(article) {
  if (!article?.isConnected) return;
  const body = article.closest('.ocr-panel-body');
  if (!body) return;
  const articleBounds = article.getBoundingClientRect();
  const bodyBounds = body.getBoundingClientRect();
  if (articleBounds.bottom > bodyBounds.bottom || articleBounds.top < bodyBounds.top) {
    body.scrollTop += articleBounds.top - bodyBounds.top - 12;
  }
}

export default function TermAnalysisPanel({ onCaptureVisibility, showMarks = true, searchSlot = null }) {
  const { user } = useAuth();
  // Resolves with the dragged screen rectangle, or rejects when the selection is cancelled.
  const [picking, setPicking] = useState(null);
  const { pathname } = useLocation();
  const [owner] = useState(() => ownerOf(getToken()));
  // The previous result of this browser tab, kept until a new analysis replaces it.
  const [restored] = useState(() => readLast(owner, GLOSSARY));
  const [analyzedAt, setAnalyzedAt] = useState(restored?.at ?? null);
  // Where the found words are marked: the dragged rectangle or the whole page, with the scroll at that moment.
  const [capture, setCapture] = useState(restored?.capture ?? null);
  const [text, setText] = useState(restored?.text ?? '');
  const [pageTerms, setPageTerms] = useState(() => restored?.pageTerms ?? []);
  const [analysisSource, setAnalysisSource] = useState(restored?.source ?? 'page');
  // Bumped when the page content changes, so marks are found again on a screen that loads late.
  const [domVersion, setDomVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  // The definition that is folding away after its chip was pressed again.
  const [leaving, setLeaving] = useState(null);
  const leaveTimer = useRef(null);
  // Words the AI found beyond the dictionary, split into investing terms, companies and other hard words.
  const [ai, setAi] = useState(() => (restored ? { status: 'done', terms: restored.terms } : { status: 'idle', terms: [] }));
  const [tab, setTab] = useState(restored?.tab ?? 'invest');
  const aiJob = useRef(null);
  // The word typed in the search box and the answer shown for it.
  const [word, setWord] = useState('');
  const [searched, setSearched] = useState(null);
  const searchJob = useRef(null);
  // Search history belongs to the account (or guest) in this browser, not to one analysis.
  const historyUser = String(user?.user_id ?? 'guest');
  const [historyState, setHistoryState] = useState(() => ({ user: historyUser, list: readHistory(historyUser) }));
  const history = historyState.user === historyUser ? historyState.list : readHistory(historyUser);
  const [phase, setPhase] = useState('idle');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const job = useRef(null);
  const definition = useRef(null);

  useEffect(() => {
    const article = definition.current;
    if ((!selected && !searched) || !article) return;
    const fit = () => revealDefinition(article);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(article.closest('.ocr-panel-body'));
    return () => observer.disconnect();
  }, [selected, searched]);

  useEffect(() => {
    if (!analyzedAt || ai.status === 'loading' || phase !== 'idle') return;
    writeLast(owner, { at: analyzedAt, source: analysisSource, text, pageTerms, terms: ai.terms, tab: tab === 'history' ? 'invest' : tab, capture });
  }, [owner, analyzedAt, analysisSource, text, pageTerms, ai, tab, capture, phase]);

  useEffect(() => {
    if (!capture) return undefined;
    let timer = 0;
    const observer = new MutationObserver((records) => {
      if (records.every((record) => record.target.parentElement?.closest?.('[data-ocr-widget]') || record.target.closest?.('[data-ocr-widget]'))) return;
      clearTimeout(timer); timer = setTimeout(() => setDomVersion((n) => n + 1), 400);
    });
    // Opening or closing a <details> only flips its open attribute, but it shows or hides the words inside.
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['open'] });
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [capture]);

  useEffect(() => () => {
    job.current?.abort(); job.current = null;
    aiJob.current?.abort(); aiJob.current = null;
    searchJob.current?.abort(); searchJob.current = null;
    onCaptureVisibility(false);
  }, [onCaptureVisibility]);

  function remember(item) {
    setHistoryState({ user: historyUser, list: addHistory(historyUser, history, item) });
  }
  function forget(term) {
    setHistoryState({ user: historyUser, list: removeHistory(historyUser, history, term) });
    if (searched?.term === term) setSearched(null);
  }
  // A dictionary word opens its entry right away; any other word is explained by the AI and kept in the history.
  function search(input) {
    const query = input.trim().slice(0, 40);
    if (!query) return;
    searchJob.current?.abort(); searchJob.current = null;
    clearTimeout(leaveTimer.current); setLeaving(null); setTab('history'); setWord('');
    const id = exactGlossaryId(query, GLOSSARY);
    if (id) { setSearched(null); setSelected(id); remember({ term: plainName(id), kind: 'dictionary', id, at: Date.now() }); return; }
    setSelected(null);
    const controller = new AbortController(); searchJob.current = controller;
    setSearched({ status: 'loading', term: query });
    detectTerms(query, [], controller.signal, { ask: true })
      .then((terms) => {
        if (searchJob.current !== controller) return;
        const detail = terms.find((term) => term.term === query) ?? terms[0];
        if (!detail) { setSearched({ status: 'error', term: query, message: '뜻을 찾지 못했어요. 다른 말로 검색해 보세요.' }); return; }
        setSearched({ status: 'done', term: detail.term, detail });
        remember({ term: detail.term, kind: 'ai', detail, at: Date.now() });
      })
      .catch((failure) => { if (searchJob.current === controller) setSearched({ status: 'error', term: query, message: failure.message }); })
      .finally(() => { if (searchJob.current === controller) searchJob.current = null; });
  }
  function openHistory(item) {
    searchJob.current?.abort(); searchJob.current = null;
    clearTimeout(leaveTimer.current); setLeaving(null);
    if (item.kind === 'dictionary') { setSearched(null); setSelected(item.id); return; }
    setSelected(null); setSearched({ status: 'done', term: item.term, detail: item.detail });
  }

  function findMore(source, known) {
    aiJob.current?.abort(); aiJob.current = null;
    if (!source.trim()) { setAi({ status: 'idle', terms: [] }); return; }
    const controller = new AbortController(); aiJob.current = controller;
    setAi({ status: 'loading', terms: [] });
    detectTerms(source, known.map(plainName), controller.signal)
      .then((terms) => { if (aiJob.current === controller) setAi({ status: 'done', terms }); })
      .catch((failure) => { if (aiJob.current === controller) setAi({ status: 'error', terms: [], message: failure.message }); })
      .finally(() => { if (aiJob.current === controller) aiJob.current = null; });
  }
  function reset() {
    job.current?.abort(); job.current = null;
    aiJob.current?.abort(); aiJob.current = null; setAi({ status: 'idle', terms: [] }); setTab('invest'); setCapture(null);
    searchJob.current?.abort(); searchJob.current = null; setSearched(null);
    setAnalyzedAt(null); clearLast();
    onCaptureVisibility(false);
    setText(''); setSelected(null); setError(''); setPhase('idle');
    setPageTerms([]); setAnalysisSource('page');
    setStatus('');
  }
  function cancel() {
    job.current?.abort(); job.current = null;
    onCaptureVisibility(false); setPhase('idle'); setError('');
    setStatus('분석을 취소했어요.');
  }
  async function recognize(file, controller) {
    controller.signal.throwIfAborted();
    setPhase('recognizing'); setStatus('그림 속 글자를 읽을 준비를 하고 있어요…');
    const result = await recognizeLocal(file, {
      signal: controller.signal,
      onProgress: (stage, progress) => {
        if (job.current !== controller) return;
        setStatus(stage === 'recognizing text' ? `그림 속 글자를 읽고 있어요. ${Math.round((progress || 0) * 100)}%` : '그림 속 글자를 읽을 준비를 하고 있어요…');
      },
    });
    controller.signal.throwIfAborted();
    return result.text;
  }
  async function execute(action, initialPhase) {
    if (job.current) return;
    const controller = new AbortController(); job.current = controller;
    setPhase(initialPhase); setError('');
    const timer = setTimeout(() => controller.abort('timeout'), 90_000);
    try { await action(controller); }
    catch (failure) {
      if (job.current !== controller) return;
      if (controller.signal.reason === 'timeout') setError('분석 시간이 오래 걸려 중단했어요. 영역을 다시 선택하거나 궁금한 말을 검색해 보세요.');
      else if (failure?.message === 'OCR_ENGINE_FAILED') setError('그림 속 글자를 읽지 못했어요. 영역을 다시 선택하거나 궁금한 말을 검색해 보세요.');
      else setError('선택한 영역을 분석하지 못했어요. 다시 선택하거나 궁금한 말을 검색해 보세요.');
      setStatus('');
    } finally {
      clearTimeout(timer);
      if (job.current === controller) { job.current = null; setPhase('idle'); onCaptureVisibility(false); }
    }
  }
  function pickRegion() {
    return new Promise((resolve, reject) => setPicking({ resolve, reject }));
  }
  async function analyzeRegion() {
    if (job.current || picking) return;
    setError(''); setStatus(''); setCapture(null);
    onCaptureVisibility(true);
    let area;
    try { area = await pickRegion(); }
    catch { setStatus('영역 선택을 취소했어요.'); return; }
    finally { setPicking(null); onCaptureVisibility(false); }
    setAnalysisSource('region'); setSelected(null); setSearched(null); setTab('invest');
    setCapture({ kind: 'region', path: pathname, area, scrollX: window.scrollX, scrollY: window.scrollY, key: Date.now(), fresh: true });
    setAnalyzedAt(Date.now());
    aiJob.current?.abort(); aiJob.current = null; setAi({ status: 'idle', terms: [] });
    const pageText = readVisiblePageText(document.body, area);
    setText(pageText);
    execute(async (controller) => {
      const pictures = await renderRegionImages(area, controller.signal);
      const pictureText = pictures.blob ? await recognize(pictures.blob, controller) : '';
      const all = [pageText, pictureText].filter(Boolean).join('\n');
      setText(all);
      findMore(all.normalize('NFKC'), findDetectedTerms(all, GLOSSARY));
      const skipped = pictures.skipped ? ` 외부 이미지 ${pictures.skipped}개는 보안상 읽을 수 없어요.` : '';
      setStatus(((all.trim() ? '' : '선택한 영역에서 글자를 찾지 못했어요. 다른 영역을 골라 보세요.') + skipped).trim());
    }, 'recognizing');
  }

  const busy = phase !== 'idle' || !!picking;
  const detected = analysisSource === 'page' ? pageTerms : findDetectedTerms(text, GLOSSARY);
  // Re-read when the AI answers so its words join the dictionary marks; text is a dependency because
  // picture text finishes after the capture, and the page may have changed in the meantime.
  // Marks belong to the screen they were found on; returning to it brings them back.
  const marksHere = !!capture && showMarks && capture.path === pathname;
  const pageMarks = useMemo(() => (marksHere ? (capture.kind === 'page'
    ? collectPageMarks(WHOLE_PAGE, GLOSSARY, ai.terms, document.body, 200)
    : collectPageMarks(shiftArea(capture, window.scrollX, window.scrollY), GLOSSARY, ai.terms)) : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [marksHere, capture, ai.terms, text, domVersion]);
  const isBasic = (id) => BASIC_IDS.has(id) || !!ai.terms.find((term) => aiId(term) === id)?.basic;
  // Easy words go last in each tab and are drawn faintly.
  const easyLast = (ids) => [...ids].sort((a, b) => isBasic(a) - isBasic(b));
  const current = selected ?? leaving;
  const entry = GLOSSARY[current];
  const aiEntry = ai.terms.find((term) => aiId(term) === current);
  const aiByTier = (tier) => ai.terms.filter((term) => term.tier === tier);
  const counts = { invest: detected.length + aiByTier('invest').length, company: aiByTier('company').length, general: aiByTier('general').length,
    history: history.length };
  const describe = (id) => {
    const found = ai.terms.find((term) => aiId(term) === id);
    if (found) return { label: found.basis === 'data' ? '종목 데이터' : '', term: found.term, text: found.meaning, code: found.code, ai: found };
    return { label: `용어사전 · ${CATEGORIES[GLOSSARY[id].category]}`, term: GLOSSARY[id].term, text: GLOSSARY[id].desc, entry: GLOSSARY[id] };
  };
  const pick = (id) => {
    clearTimeout(leaveTimer.current); setLeaving(null);
    if (id === selected) revealDefinition(definition.current);
    setSelected(id); setSearched(null);
    setTab(ai.terms.find((term) => aiId(term) === id)?.tier ?? 'invest');
  };
  // A detected chip pressed again folds its definition so the panel shrinks back.
  const toggle = (id) => {
    if (id !== selected) { pick(id); return; }
    setSelected(null); setLeaving(id);
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setLeaving(null), 220);
  };
  // Same definition card as the glossary. The AI warning lives once on the experimental switch in My page, not on every card.
  const aiCard = (term, closing = false) => <div key={`ai:${term.term}`} className={`ocr-reveal${closing ? ' is-closing' : ''}`}><div className="ocr-reveal-clip">
    <TermCard ref={definition} categoryLabel={term.basis === 'data' ? '종목 데이터' : undefined} term={{ term: term.term, desc: term.meaning }} beforeDescription={<CompanyFacts term={term} />}>
      {term.code && <Link className="relative z-10 mt-3 text-xs font-medium text-brand-600" to={`/trading?code=${encodeURIComponent(term.code)}`}>종목 보기 · {term.code} →</Link>}
    </TermCard>
  </div></div>;
  const emptyNote = tab === 'history' ? '검색한 말이 여기에 남아요. 위 검색창에 궁금한 말을 입력해 보세요.'
    : ai.status === 'done' ? '이 글에서는 더 찾은 말이 없어요.' : '아직 찾은 말이 없어요. 영역 선택 분석으로 궁금한 곳을 골라 보세요.';
  const searchBox = <form className="ocr-search" role="search" onSubmit={(event) => { event.preventDefault(); search(word); }}>
    <input value={word} maxLength={40} aria-label="궁금한 말 검색" placeholder="궁금한 말 검색 (예: 공매도)"
      onChange={(event) => setWord(event.target.value)} />
    <button type="submit" aria-label="검색" disabled={!word.trim()}><Search size={15} aria-hidden="true" /></button>
  </form>;
  return <div className="ocr-panel-body" aria-busy={busy}>
    {searchSlot ? createPortal(searchBox, searchSlot) : searchBox}
    <div className="ocr-actions">
      <button type="button" className="ocr-primary" disabled={busy} onClick={analyzeRegion}>영역 선택 분석</button>
      {busy && <button type="button" className="ocr-secondary" onClick={cancel}>작업 취소</button>}
    </div>
    {status && <p className="ocr-status" role="status">{status}</p>}
    {error && <p className="ocr-error" role="alert">{error}</p>}
    <div className="ocr-tabs" role="tablist" aria-label="찾은 말 종류">
      {Object.entries(TABS).map(([id, label]) =>
        <button type="button" role="tab" key={id} className="ocr-tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}<b>{counts[id]}</b></button>)}
    </div>
    <div className="ocr-chips ocr-detected" role="tabpanel" aria-label={TABS[tab]} tabIndex={0}>
      {tab === 'invest' && easyLast(detected).map((id) => <button type="button" className={`ocr-term${BASIC_IDS.has(id) ? ' is-basic' : ''}`} key={id}
        title={BASIC_IDS.has(id) ? '대부분 아는 쉬운 말' : undefined} aria-pressed={id === selected} onClick={() => toggle(id)}>{GLOSSARY[id].term}</button>)}
      {tab !== 'history' && [...aiByTier(tab)].sort((a, b) => a.basic - b.basic).map((term, index) => <button type="button" className={`ocr-term is-ai is-${term.tier}${term.basic ? ' is-basic' : ''}`} key={aiId(term)}
        style={{ '--i': index }} title={term.basic ? 'AI가 찾은 말 · 대부분 아는 쉬운 말' : 'AI가 찾은 말'} aria-pressed={aiId(term) === selected} onClick={() => toggle(aiId(term))}>{term.term}{term.code && <small>상장</small>}</button>)}
      {tab === 'history' && history.map((item) => <span key={item.term} className="ocr-history">
        <button type="button" className={`ocr-term${item.kind === 'ai' ? ` is-ai is-${item.detail.tier}` : ''}`}
          title={item.kind === 'dictionary' ? '용어사전' : 'AI가 풀이한 말'} aria-pressed={item.kind === 'dictionary' ? item.id === selected : searched?.term === item.term} onClick={() => openHistory(item)}>
          {item.term}{item.kind === 'ai' && item.detail.code && <small>상장</small>}</button>
        <button type="button" className="ocr-history-remove" aria-label={`${item.term} 검색 기록 지우기`} onClick={() => forget(item.term)}><X size={12} aria-hidden="true" /></button>
      </span>)}
    </div>
    {tab !== 'history' && ai.status === 'loading' && <p className="ocr-note ocr-ai-loading">AI가 사전에 없는 말을 더 찾고 있어요…</p>}
    {tab !== 'history' && ai.status === 'error' && <p className="ocr-note">{ai.message}</p>}
    {(tab === 'history' || (ai.status !== 'loading' && ai.status !== 'error')) && !counts[tab] && <p className="ocr-note">{emptyNote}</p>}
    {searched?.status === 'loading' && <p className="ocr-note ocr-ai-loading">‘{searched.term}’ 뜻을 찾고 있어요…</p>}
    {searched?.status === 'error' && <p className="ocr-note">‘{searched.term}’ · {searched.message}</p>}
    {searched?.status === 'done' && aiCard(searched.detail)}
    {aiEntry && aiCard(aiEntry, !selected)}
    {entry && <div key={selected ?? leaving} className={`ocr-reveal ${selected ? '' : 'is-closing'}`}><div className="ocr-reveal-clip">
      <TermCard ref={definition} categoryLabel={`기존 용어사전 · ${CATEGORIES[entry.category]}`} term={entry} onPickRelated={pick} />
    </div></div>}
    <button type="button" className="ocr-reset" onClick={reset}>결과 초기화</button>
    {marksHere && <PageMarks marks={pageMarks} scan={capture.fresh ? capture : null} active={selected} onPick={toggle} describe={describe} />}
    {picking && <RegionSelector onSelect={picking.resolve} onCancel={() => picking.reject(new DOMException('Selection cancelled', 'AbortError'))} />}
  </div>;
}
