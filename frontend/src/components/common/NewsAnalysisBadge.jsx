const sentiments = { POSITIVE: ['호재', 'bg-red-50 text-red-700'], NEUTRAL: ['중립', 'bg-gray-100 text-gray-700'], NEGATIVE: ['악재', 'bg-blue-50 text-blue-700'] };
const importance = { LOW: '낮음', MEDIUM: '보통', HIGH: '높음' };

export default function NewsAnalysisBadge({ analysis }) {
  const sentiment = sentiments[analysis?.sentiment?.label];
  const level = importance[analysis?.importance?.label];
  if (!sentiment || !level) return null;
  return <div className="flex flex-wrap gap-2 text-xs" aria-label="AI 뉴스 분석">
    <span className={`rounded-full px-2 py-1 ${sentiment[1]}`}>AI {sentiment[0]}</span>
    <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">중요도 {level}</span>
  </div>;
}
