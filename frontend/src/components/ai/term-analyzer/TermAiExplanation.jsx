import { useEffect, useId, useRef, useState } from 'react';
import { explainTerm, termAiEnabled } from './termAiApi';
import { explanationFields, TERM_AI_TIMEOUT_MS, validateTermRequest } from './termAiContract';

export default function TermAiExplanation({ target, onClose }) {
  const [context, setContext] = useState('');
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const titleId = useId();
  const [confirmOpen, setConfirmOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const job = useRef(null);
  const dialog = useRef(null);
  const cancelButton = useRef(null);

  useEffect(() => () => { job.current?.abort(); job.current = null; }, []);
  useEffect(() => {
    if (!confirmOpen) return;
    const element = dialog.current, previousFocus = document.activeElement;
    element.showModal(); cancelButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [confirmOpen]);

  function cancel() {
    job.current?.abort(); job.current = null; setBusy(false);
    setError('요청을 취소했습니다. 이미 서버에 도착한 요청의 처리는 끝났을 수 있습니다.');
  }
  function dismiss(event) {
    event?.preventDefault(); event?.stopPropagation();
    if (result || error) setConfirmOpen(false);
    else onClose();
  }
  function keyDown(event) {
    if (event.key === 'Escape') { dismiss(event); return; }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.current.querySelectorAll('button:not([disabled]), textarea:not([disabled])')].filter((element) => element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  async function submit(event) {
    event.preventDefault();
    if (job.current) return;
    if (!termAiEnabled) { setFormError('AI 설명 기능 준비 중'); return; }
    // Confirmation is this submit action, never a previously stored checkbox state.
    const payload = { term: target, context: context.trim(), contextReviewed: true };
    try { validateTermRequest(payload); } catch (failure) { setFormError(failure.message); return; }
    const controller = new AbortController(); job.current = controller;
    setConfirmOpen(false); setBusy(true); setError(''); setFormError(''); setResult(null);
    const timer = setTimeout(() => controller.abort('timeout'), TERM_AI_TIMEOUT_MS);
    try {
      const data = await explainTerm(payload, controller.signal);
      if (job.current === controller) setResult(data);
    } catch (failure) {
      if (job.current === controller) setError(controller.signal.reason === 'timeout' ? 'AI 응답 시간이 초과됐습니다. 다시 시도해 주세요.' : failure.message);
    } finally {
      clearTimeout(timer);
      if (job.current === controller) { job.current = null; setBusy(false); }
    }
  }

  function retry() { setFormError(''); setContextOpen(result?.status === 'needs_context'); setConfirmOpen(true); }

  return <section className="ocr-ai-state" aria-label={`${target.text} AI 설명`}>
    {busy && <div role="status"><p>AI 설명 요청 중…</p><button type="button" className="ocr-secondary" onClick={cancel}>AI 요청 취소</button></div>}
    {error && <><p className="ocr-error" role="alert">{error}</p><button type="button" className="ocr-secondary" onClick={retry}>다시 질문</button></>}
    {result && <div className="ocr-ai-result" role="status">
      <p className="ocr-note">{target.text} · AI 설명 · 학습용</p>
      {result.status === 'explained' ? <dl>{explanationFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{result[key]}</dd></div>)}</dl> : <p>{result.message}</p>}
      {result.status === 'needs_context' && <button type="button" className="ocr-secondary" onClick={retry}>상황 추가해서 다시 질문</button>}
    </div>}
    {confirmOpen && <dialog ref={dialog} className="ocr-ai-confirm ocr-widget" data-term-confirm aria-modal="true" aria-labelledby={titleId} onCancel={dismiss} onKeyDown={keyDown}>
      <h3 id={titleId}>Gemini에 질문할까요?</h3>
      <form onSubmit={submit}>
        <p>용어: <strong>{target.text}</strong></p>
        {context.trim() && <p className="ocr-ai-context-preview">추가 문맥: {context.trim()}</p>}
        <p className="ocr-note">용어와 확인한 문맥만 전송합니다. 원본 이미지·전체 OCR 내용은 보내지 않습니다.</p>
        <button type="button" className="ocr-secondary ocr-context-toggle" aria-expanded={contextOpen} aria-controls={contextId}
          onClick={() => setContextOpen((open) => !open)}>추가 상황 설명하기 (선택)<span aria-hidden="true">{contextOpen ? '접기 ▴' : '펼치기 ▾'}</span></button>
        <div id={contextId} className="ocr-context-content" hidden={!contextOpen}>
          <label className="ocr-label" htmlFor="ocr-ai-context">추가 문맥 · 개인정보 없이 240자 이내</label>
          <textarea id="ocr-ai-context" maxLength={240} value={context} placeholder="예: 주식 차트의 지표 이름으로 표시돼요."
            onChange={(event) => { setContext(event.target.value); setFormError(''); }} />
        </div>
        {!termAiEnabled && <p className="ocr-note" role="status">AI 설명 기능 준비 중</p>}
        {formError && <p className="ocr-error" role="alert">{formError}</p>}
        <div className="ocr-actions"><button ref={cancelButton} type="button" className="ocr-secondary" onClick={dismiss}>취소</button>
          <button type="submit" className="ocr-primary" disabled={!termAiEnabled}>확인하고 AI 요청</button></div>
      </form>
    </dialog>}
  </section>;
}
