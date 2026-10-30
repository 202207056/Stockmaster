import { aggregateMarketMood } from '../../utils/marketMood';

const segments = [
  ['POSITIVE', '호재', 'bg-up-500'],
  ['NEUTRAL', '중립', 'bg-flat-500'],
  ['NEGATIVE', '악재', 'bg-down-500'],
];

export default function MarketMoodCard({ news, resource, authenticated }) {
  if (!authenticated || resource.error) return null;
  if (resource.loading) return <section aria-label="오늘의 시장 분위기 분석 중" aria-busy="true" className="mb-6 animate-pulse rounded-xl border border-gray-100 bg-gray-50 p-5">
    <div className="h-5 w-40 rounded bg-gray-200" /><div className="mt-4 h-3 rounded bg-gray-200" />
  </section>;
  const mood = aggregateMarketMood(news, resource.data);
  if (mood.total < 3) return null;
  const summary = `호재 ${mood.counts.POSITIVE} · 중립 ${mood.counts.NEUTRAL} · 악재 ${mood.counts.NEGATIVE}`;
  return <section aria-label="오늘의 시장 분위기" className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-bold text-gray-900">오늘의 시장 분위기</h2>
      <span className="text-xs font-medium text-brand-600">AI 뉴스 분석 {mood.total}건 기준</span>
    </div>
    <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label={summary}>
      {segments.map(([label, , color]) => <span key={label} className={color} style={{ width: `${mood.percentages[label]}%` }} />)}
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
      {segments.map(([label, name, color]) => <span key={label} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />{name} {mood.counts[label]}</span>)}
    </div>
    {mood.highTitle && <p className="mt-4 break-words text-sm text-gray-800"><span className="font-bold text-brand-600">중요도 높은 뉴스</span> · {mood.highTitle}</p>}
    <p className="mt-4 text-xs leading-relaxed text-gray-500">뉴스 감성 집계이며 시장 전망이나 투자 조언이 아닙니다.</p>
  </section>;
}
