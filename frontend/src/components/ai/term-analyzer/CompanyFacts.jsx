// Small facts under a company name: listing market, index, sector and size. A market confirmed by our
// stock data is marked as checked; everything else comes from the AI and is labelled that way.
export default function CompanyFacts({ term }) {
  const facts = term?.facts;
  if (!facts) return null;
  const chips = [
    facts.listing && { text: facts.listing, checked: facts.checked },
    facts.index && { text: facts.index },
    facts.sector && { text: facts.sector },
    facts.size && { text: `${facts.size} 기업` },
  ].filter(Boolean);
  if (!chips.length && term.basis !== 'context') return null;
  return <div className="ocr-facts">
    {term.basis === 'context' && <span className="ocr-fact is-context" title="AI가 잘 모르는 회사라 글에 적힌 내용만으로 설명했어요">글 내용 기준</span>}
    {chips.map((chip) => <span key={chip.text} className={`ocr-fact${chip.checked ? ' is-checked' : ''}`}
      title={chip.checked ? '우리 종목 데이터로 확인한 정보' : 'AI가 알려 준 정보라 틀릴 수 있어요'}>{chip.checked && '✓ '}{chip.text}</span>)}
  </div>;
}
