import { useId, useState } from 'react';
import { GLOSSARY } from '../../constants/glossary';
import { exactGlossaryId } from './termAiContract';
import { WIKI_ENABLED } from './wikiLookup';

export default function TermQuestion({ onPick, onAsk, onLookup, onEdit, selectedNewsWord = '', busy = false, lookupBusy = false }) {
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);
  const [word, setWord] = useState('');
  const text = word.trim();
  const glossaryId = exactGlossaryId(text, GLOSSARY);
  function ask() {
    if (text) onAsk({ text, glossaryId: null });
  }
  return <section className="ocr-question" aria-label="사전에 없는 용어 질문">
    <button type="button" className="ocr-secondary ocr-question-toggle" aria-expanded={expanded} aria-controls={contentId}
      onClick={() => setExpanded((value) => !value)}>다른 용어 직접 질문하기<span aria-hidden="true">{expanded ? '접기 ▴' : '펼치기 ▾'}</span></button>
    <div id={contentId} className="ocr-question-content" hidden={!expanded}>
    <label className="ocr-label" htmlFor="ocr-ai-term">궁금한 용어</label>
    <input id="ocr-ai-term" value={word} maxLength={60} placeholder="예: 듀레이션" onChange={(event) => { setWord(event.target.value); onAsk(null); onEdit?.(); }}
      onKeyDown={(event) => { if (WIKI_ENABLED && event.key === 'Enter' && !event.nativeEvent.isComposing && text && !busy) { event.preventDefault(); onLookup(text); } }} />
    {WIKI_ENABLED && <><p className="ocr-note">검색할 때 입력한 용어만 한국어 위키백과로 보내요.</p>
      <button type="button" className="ocr-secondary" disabled={!selectedNewsWord || busy}
        onClick={() => { setWord(selectedNewsWord); onAsk(null); onLookup(selectedNewsWord); }}>선택한 단어 가져오기</button></>}
    {glossaryId ? <><p className="ocr-note">기존 사전에 있는 용어입니다. 사전 설명을 바로 볼 수 있습니다.</p><button type="button" className="ocr-secondary" onClick={() => onPick(glossaryId)}>사전 설명 보기</button></>
      : <>{WIKI_ENABLED && <button type="button" className="ocr-secondary" disabled={!text || busy || lookupBusy} onClick={() => onLookup(text)}>뜻 찾아보기</button>}
        <button type="button" className="ocr-secondary" disabled={!text} onClick={ask}>AI에게 뜻 물어보기</button></>}
    </div>
  </section>;
}
