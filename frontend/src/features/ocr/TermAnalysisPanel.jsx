import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, GLOSSARY } from '../../constants/glossary';
import { findDetectedTerms } from './terms';
import { recognizeLocal } from './ocr';
import PageMarks from './PageMarks';
import CompanyFacts from './CompanyFacts';
import { collectPageMarks, shiftArea, WHOLE_PAGE } from './pageMarkRanges';
import { clearLast, ownerOf, readLast, savedTime, writeLast } from './lastAnalysis';
import { detectTerms } from './termDetect';
import { Link, useLocation } from 'react-router-dom';
import { aiId, BASIC_IDS, TIER_LABELS } from './readMarks';
import RegionSelector from './RegionSelector';
import { renderRegionImages } from './regionImage';
import useAuth from '../../hooks/useAuth';
import { getSessionId, getToken } from '../../api/client';
import TermAiExplanation from './TermAiExplanation';
import TermQuestion from './TermQuestion';
import { readVisiblePageText } from './pageText';
import { WIKI_ENABLED } from './wikiLookup';
import WikiExplanation from './WikiExplanation';
import useWikiTerm from './useWikiTerm';

const plainName = (id) => GLOSSARY[id].term.split(' (')[0].split(' · ')[0];

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

export default function TermAnalysisPanel({ onCaptureVisibility, selectedNewsWord = '', showMarks = true }) {
  const { user, status: authStatus } = useAuth();
  // Resolves with the dragged screen rectangle, or rejects when the selection is cancelled.
  const [picking, setPicking] = useState(null);
  const { pathname } = useLocation();
  const [owner] = useState(() => ownerOf(getToken()));
  // The previous result of this browser tab, shown with its time until a new analysis replaces it.
  const [restored] = useState(() => readLast(owner, GLOSSARY));
  const [analyzedAt, setAnalyzedAt] = useState(restored?.at ?? null);
  const [restoredAt, setRestoredAt] = useState(restored?.at ?? null);
  // Where the found words are marked: the dragged rectangle or the whole page, with the scroll at that moment.
  const [capture, setCapture] = useState(restored?.capture ?? null);
  const [text, setText] = useState(restored?.text ?? '');
  const [pageTerms, setPageTerms] = useState(() => restored?.pageTerms ?? findDetectedTerms(readVisiblePageText(), GLOSSARY));
  const [analysisSource, setAnalysisSource] = useState(restored?.source ?? 'page');
  // Bumped when the page content changes, so marks are found again on a screen that loads late.
  const [domVersion, setDomVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  // The definition that is folding away after its chip was pressed again.
  const [leaving, setLeaving] = useState(null);
  const leaveTimer = useRef(null);
  const [aiRequest, setAiTarget] = useState(null);
  // Words the AI found beyond the dictionary, split into investing terms and other hard words.
  const [ai, setAi] = useState(() => (restored ? { status: 'done', terms: restored.terms } : { status: 'idle', terms: [] }));
  const [tab, setTab] = useState(restored?.tab ?? 'invest');
  const aiJob = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const metrics = useRef(null);
  const job = useRef(null);
  const definition = useRef(null);
  const aiSequence = useRef(0);
  const { result: wikiResult, lookup: lookupTerm, clear: clearWiki, cancel: cancelWiki, chooseCandidate: chooseWikiCandidate } = useWikiTerm({ setSelected, setAiTarget, ocrJob: job });
  function setMetrics(value) { metrics.current = value; }

  useEffect(() => {
    const article = definition.current;
    if (!selected || !article) return;
    const fit = () => revealDefinition(article);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(article.closest('.ocr-panel-body'));
    return () => observer.disconnect();
  }, [selected]);

  useEffect(() => {
    if (!analyzedAt || ai.status === 'loading' || phase !== 'idle') return;
    writeLast(owner, { at: analyzedAt, source: analysisSource, text, pageTerms, terms: ai.terms, tab, capture });
  }, [owner, analyzedAt, analysisSource, text, pageTerms, ai, tab, capture, phase]);

  useEffect(() => {
    if (!capture) return undefined;
    let timer = 0;
    const observer = new MutationObserver((records) => {
      if (records.every((record) => record.target.parentElement?.closest?.('[data-ocr-widget]') || record.target.closest?.('[data-ocr-widget]'))) return;
      clearTimeout(timer); timer = setTimeout(() => setDomVersion((n) => n + 1), 400);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [capture]);

  useEffect(() => () => {
    job.current?.abort(); job.current = null;
    aiJob.current?.abort(); aiJob.current = null;
    onCaptureVisibility(false);
  }, [onCaptureVisibility]);

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
    clearWiki();
    job.current?.abort(); job.current = null;
    aiJob.current?.abort(); aiJob.current = null; setAi({ status: 'idle', terms: [] }); setTab('invest'); setCapture(null);
    setAnalyzedAt(null); setRestoredAt(null); clearLast();
    onCaptureVisibility(false);
    setText(''); setSelected(null); setAiTarget(null); setError(''); setMetrics(null); setPhase('idle');
    setPageTerms([]); setAnalysisSource('page');
    setStatus('');
  }
  function cancel() {
    job.current?.abort(); job.current = null;
    onCaptureVisibility(false); setPhase('idle'); setError('');
    setStatus('분석을 취소했어요.');
  }
  function analyzePage() {
    if (job.current) return;
    clearWiki();
    const pageText = readVisiblePageText().normalize('NFKC');
    const terms = findDetectedTerms(pageText, GLOSSARY);
    setPageTerms(terms); setAnalysisSource('page'); setText(pageText); setAnalyzedAt(Date.now()); setRestoredAt(null);
    setCapture({ kind: 'page', path: pathname, area: { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight },
      scrollX: window.scrollX, scrollY: window.scrollY, key: Date.now(), fresh: true });
    setSelected(null); setAiTarget(null); setMetrics(null); setError('');
    setStatus(''); setTab('invest');
    findMore(pageText, terms);
  }
  async function recognize(file, controller, scope = 'full') {
    controller.signal.throwIfAborted();
    setPhase('recognizing'); setStatus('그림 속 글자를 읽을 준비를 하고 있어요…');
    const started = performance.now();
    const result = await recognizeLocal(file, {
      signal: controller.signal,
      onProgress: (stage, progress) => {
        if (job.current !== controller) return;
        setStatus(stage === 'recognizing text' ? `그림 속 글자를 읽고 있어요. ${Math.round((progress || 0) * 100)}%` : '그림 속 글자를 읽을 준비를 하고 있어요…');
      },
    });
    controller.signal.throwIfAborted();
    setMetrics({ ms: Math.round(performance.now() - started), confidence: result.confidence, scope });
    return result.text;
  }
  async function execute(action, initialPhase) {
    if (job.current) return;
    clearWiki();
    const controller = new AbortController(); job.current = controller;
    setPhase(initialPhase); setError('');
    const timer = setTimeout(() => controller.abort('timeout'), 90_000);
    try { await action(controller); }
    catch (failure) {
      if (job.current !== controller) return;
      if (controller.signal.reason === 'timeout') setError('분석 시간이 오래 걸려 중단했어요. 영역을 다시 선택하거나 직접 질문해 주세요.');
      else if (failure?.message === 'OCR_ENGINE_FAILED') setError('그림 속 글자를 읽지 못했어요. 영역을 다시 선택하거나 용어를 직접 질문해 주세요.');
      else setError('선택한 영역을 분석하지 못했어요. 다시 선택하거나 용어를 직접 질문해 주세요.');
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
    clearWiki(); setError(''); setStatus(''); setCapture(null);
    onCaptureVisibility(true);
    let area;
    try { area = await pickRegion(); }
    catch { setStatus('영역 선택을 취소했어요.'); return; }
    finally { setPicking(null); onCaptureVisibility(false); }
    setAnalysisSource('region'); setSelected(null); setAiTarget(null); setMetrics(null); setTab('invest');
    setCapture({ kind: 'region', path: pathname, area, scrollX: window.scrollX, scrollY: window.scrollY, key: Date.now(), fresh: true });
    setAnalyzedAt(Date.now()); setRestoredAt(null);
    aiJob.current?.abort(); aiJob.current = null; setAi({ status: 'idle', terms: [] });
    const pageText = readVisiblePageText(document.body, area);
    setText(pageText);
    execute(async (controller) => {
      const pictures = await renderRegionImages(area, controller.signal);
      const pictureText = pictures.blob ? await recognize(pictures.blob, controller, 'region') : '';
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
  const counts = { invest: detected.length + aiByTier('invest').length, company: aiByTier('company').length, general: aiByTier('general').length };
  const describe = (id) => {
    const found = ai.terms.find((term) => aiId(term) === id);
    if (found) return { label: found.basis === 'data' ? '종목 데이터 · 기업' : `AI 풀이 · ${TIER_LABELS[found.tier]}`, term: found.term, text: found.meaning, code: found.code, ai: found };
    return { label: `용어사전 · ${CATEGORIES[GLOSSARY[id].category]}`, term: GLOSSARY[id].term, text: GLOSSARY[id].desc };
  };
  const pick = (id) => {
    clearTimeout(leaveTimer.current); setLeaving(null);
    clearWiki(); if (id === selected) revealDefinition(definition.current); setSelected(id); setAiTarget(null);
    setTab(ai.terms.find((term) => aiId(term) === id)?.tier ?? 'invest');
  };
  // A detected chip pressed again folds its definition so the panel shrinks back.
  const toggle = (id) => {
    if (id !== selected) { pick(id); return; }
    clearWiki(); setAiTarget(null); setSelected(null); setLeaving(id);
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setLeaving(null), 220);
  };
  const line = (n) => ({ '--line': n });
  const aiOwner = `${authStatus}:${user?.user_id ?? 'guest'}:${getSessionId()}`;
  const aiTarget = aiRequest?.owner === aiOwner ? aiRequest : null;
  const askAi = (term) => { if (term) clearWiki(); setAiTarget(term ? { term, owner: aiOwner, sequence: ++aiSequence.current } : null); };
  const aiKey = `${aiOwner}:${aiTarget?.sequence}`;
  const dictionaryAi = !!entry && aiTarget?.term.glossaryId === selected;
  return <div className="ocr-panel-body" aria-busy={busy}>
    <div className="ocr-actions">
      <button type="button" className="ocr-primary" disabled={busy} onClick={analyzePage}>페이지 전체 분석</button>
      <button type="button" className="ocr-secondary" disabled={busy} onClick={analyzeRegion}>영역 선택 분석</button>
      {busy && <button type="button" className="ocr-secondary" onClick={cancel}>작업 취소</button>}
    </div>
    {status && <p className="ocr-status" role="status">{status}</p>}
    {error && <p className="ocr-error" role="alert">{error}</p>}
    {restoredAt && <p className="ocr-note ocr-restored"><span>이전 결과</span>{savedTime(restoredAt)}에 분석했어요
      {capture && capture.path !== pathname ? ' · 다른 화면에서 분석한 결과예요' : ''}. 새로 보려면 위에서 다시 분석하세요.</p>}
    <div className="ocr-tabs" role="tablist" aria-label="찾은 말 종류">
      {Object.entries(TIER_LABELS).map(([id, label]) =>
        <button type="button" role="tab" key={id} className="ocr-tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}<b>{counts[id]}</b></button>)}
    </div>
    <div className="ocr-chips ocr-detected" role="tabpanel" aria-label={TIER_LABELS[tab]} tabIndex={0}>
      {tab === 'invest' && easyLast(detected).map((id) => <button type="button" className={`ocr-term${BASIC_IDS.has(id) ? ' is-basic' : ''}`} key={id}
        title={BASIC_IDS.has(id) ? '대부분 아는 쉬운 말' : undefined} aria-pressed={id === selected} onClick={() => toggle(id)}>{GLOSSARY[id].term}</button>)}
      {[...aiByTier(tab)].sort((a, b) => a.basic - b.basic).map((term) => <button type="button" className={`ocr-term is-ai is-${term.tier}${term.basic ? ' is-basic' : ''}`} key={aiId(term)}
        title={term.basic ? '대부분 아는 쉬운 말' : undefined} aria-pressed={aiId(term) === selected} onClick={() => toggle(aiId(term))}>{term.term}<small>{term.code ? '상장' : 'AI'}</small></button>)}
    </div>
    {ai.status === 'loading' && <p className="ocr-note ocr-ai-loading">AI가 사전에 없는 말을 더 찾고 있어요…</p>}
    {ai.status === 'error' && <p className="ocr-note">{ai.message}</p>}
    {ai.status !== 'loading' && ai.status !== 'error' && !counts[tab]
      && <p className="ocr-note">{ai.status === 'done' ? '이 글에서는 더 찾은 말이 없어요.' : '아직 찾은 말이 없어요. 페이지 전체 분석이나 영역 선택 분석을 해 보세요.'}</p>}
    {aiEntry && <div key={current} className={`ocr-reveal ${selected ? '' : 'is-closing'}`}><div className="ocr-reveal-clip"><article ref={definition} className="ocr-definition">
      <p className="ocr-note ocr-line" style={line(0)}>{aiEntry.basis === 'data' ? '종목 데이터 · 기업 · AI가 놓친 상장사를 채웠어요'
        : `AI 풀이 · ${TIER_LABELS[aiEntry.tier]} · ${aiEntry.basis === 'context' ? '글에 적힌 내용 기준' : '이 글의 맥락 기준'}`}</p>
      <h3 className="ocr-line" style={line(1)}>{aiEntry.term}</h3>
      <div className="ocr-line" style={line(1)}><CompanyFacts term={aiEntry} /></div>
      <p className="ocr-line" style={line(2)}>{aiEntry.meaning}</p>
      {aiEntry.code && <div className="ocr-line" style={line(3)}><Link className="ocr-secondary ocr-stock-link" to={`/trading?code=${encodeURIComponent(aiEntry.code)}`}>종목 보기 · {aiEntry.code}</Link></div>}
      {aiEntry.basis !== 'data' && <p className="ocr-note ocr-line" style={line(4)}>AI가 만든 풀이라 틀릴 수 있어요. 투자 판단의 근거로 쓰지 마세요.</p>}
    </article></div></div>}
    {entry && <div key={selected ?? leaving} className={`ocr-reveal ${selected ? '' : 'is-closing'}`}><div className="ocr-reveal-clip"><article ref={definition} className="ocr-definition">
      <p className="ocr-note ocr-line" style={line(0)}>기존 용어사전 · {CATEGORIES[entry.category]}</p>
      <h3 className="ocr-line" style={line(1)}>{entry.term}</h3><p className="ocr-line" style={line(2)}>{entry.desc}</p><p className="ocr-example ocr-line" style={line(3)}>예시: {entry.example}</p>
      <div className="ocr-line" style={line(4)}><button type="button" className="ocr-secondary" onClick={() => askAi({ text: entry.term.split(' (')[0].split(' · ')[0], glossaryId: selected })}>AI로 더 쉽게 설명</button></div>
      <div className="ocr-chips ocr-line" style={line(5)}>{entry.related?.filter((id) => GLOSSARY[id]).map((id) => <button type="button" className="ocr-secondary" key={id} onClick={() => pick(id)}>{GLOSSARY[id].term}</button>)}</div>
      {dictionaryAi && <TermAiExplanation key={aiKey} target={aiTarget.term} onClose={() => setAiTarget(null)} />}
    </article></div></div>}
    {WIKI_ENABLED && <WikiExplanation result={wikiResult} onCancel={cancelWiki} onSelect={chooseWikiCandidate} />}
    {/* One shared question below the list and definition; keep its draft across OCR runs. */}
    <TermQuestion onPick={pick} onAsk={askAi} onLookup={lookupTerm} onEdit={clearWiki} selectedNewsWord={selectedNewsWord} busy={busy} lookupBusy={wikiResult?.status === 'loading'} />
    <button type="button" className="ocr-reset" onClick={reset}>결과 초기화</button>
    {aiTarget && !dictionaryAi && <TermAiExplanation key={aiKey} target={aiTarget.term} onClose={() => setAiTarget(null)} />}
    {marksHere && <PageMarks marks={pageMarks} scan={capture.fresh ? capture : null} active={selected} onPick={toggle} describe={describe} />}
    {picking && <RegionSelector onSelect={picking.resolve} onCancel={() => picking.reject(new DOMException('Selection cancelled', 'AbortError'))} />}
  </div>;
}
