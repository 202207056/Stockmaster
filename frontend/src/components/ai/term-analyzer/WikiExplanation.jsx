const messages = {
  not_found: '알맞은 문서를 찾지 못했어요. 용어 표기를 확인해 주세요.',
  ambiguous: '뜻을 하나로 정하기 어려워요. 찾으시는 금융 문서를 선택해 주세요.',
  unrelated: '입력한 용어와 일치하는 설명을 찾지 못했어요.',
  not_financial: '금융용어 설명으로 확인되지 않아 표시하지 않았어요.',
  no_summary: '이 문서에서 짧은 설명을 가져오지 못했어요.',
  invalid_input: '개인정보를 제외하고 용어만 2~60자로 입력해 주세요.',
  invalid_response: '검색 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
  unavailable: '인터넷 검색에 연결하지 못했어요. 기존 사전은 계속 사용할 수 있어요.',
  timeout: '검색 시간이 오래 걸려 중단했어요. 잠시 후 다시 시도해 주세요.',
  rate_limited: '검색 요청이 많아요. 잠시 후 다시 시도해 주세요.',
  cancelled: '검색을 취소했어요.', disabled: '인터넷 용어 검색은 준비 중이에요.',
};

export default function WikiExplanation({ result, onCancel, onSelect }) {
  if (!result) return null;
  return <article className="ocr-definition" aria-label="인터넷 용어 설명">
    <p className="ocr-note">인터넷 검색 · 한국어 위키백과</p>
    {result.term && <h3>{result.title ?? result.term}</h3>}
    {result.status === 'loading' ? <><p role="status">용어 검색 중...</p><button type="button" className="ocr-secondary" onClick={onCancel}>검색 취소</button></>
      : result.status === 'found' ? <>
        <p>{result.summary}</p>
        <p className="ocr-note"><a href={result.url} target="_blank" rel="noopener noreferrer">출처: {result.title}</a>{' · '}
          <a href={result.historyUrl} target="_blank" rel="noopener noreferrer">기여 이력</a>{' · '}
          <a href={result.licenseUrl} target="_blank" rel="noopener noreferrer">{result.license}</a>
          <br />{result.credit} · {result.modification}</p>
      </> : <><p role="status">{result.status === 'ambiguous' && !result.candidates?.length
        ? '여러 뜻이 있지만 알맞은 금융 설명을 확인하지 못했어요.' : messages[result.status] ?? messages.unavailable}</p>
        {result.status === 'ambiguous' && !!result.candidates?.length && <ul aria-label="금융 문서 후보">
          {result.candidates.map(candidate => <li key={candidate.pageId}><button type="button" className="ocr-secondary"
            onClick={() => onSelect?.(candidate.title)}>{candidate.title}</button></li>)}
        </ul>}
        {result.status === 'ambiguous' && !!result.unverifiedTitles?.length && <p className="ocr-note">
          설명을 확인하지 못한 후보: {result.unverifiedTitles.join(', ')}
        </p>}
      </>}
  </article>;
}
