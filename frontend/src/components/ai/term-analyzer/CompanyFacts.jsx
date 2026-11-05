const SIZE_LABELS = { 대기업: '대기업', 중견: '중견기업', 중소: '중소기업', 스타트업: '스타트업' };

// Small facts under a company name: group, parent, size, listing market, index and sector. A market
// confirmed by our stock data is marked as checked; everything else comes from the AI and is labelled that way.
export default function CompanyFacts({ term }) {
  const facts = term?.facts;
  if (!facts) return null;
  const chips = [
    facts.group && { text: `${facts.group} 계열`, kind: 'group' },
    facts.parent && { text: `모회사 ${facts.parent}` },
    facts.size && { text: SIZE_LABELS[facts.size] ?? facts.size, kind: 'size' },
    facts.listing && { text: facts.listing, checked: facts.checked },
    facts.index && { text: facts.index },
    facts.sector && { text: facts.sector },
  ].filter(Boolean);
  if (!chips.length && term.basis !== 'context') return null;
  return <div className="ocr-facts">
    {term.basis === 'context' && <span className="ocr-fact is-context" title="AI가 잘 모르는 회사라 글에 적힌 내용만으로 설명했어요">글 내용 기준</span>}
    {chips.map((chip) => <span key={chip.text} className={`ocr-fact${chip.checked ? ' is-checked' : ''}${chip.kind ? ` is-${chip.kind}` : ''}`}
      title={chip.checked ? '우리 종목 데이터로 확인한 정보' : undefined}>{chip.checked && '✓ '}{chip.text}</span>)}
  </div>;
}
