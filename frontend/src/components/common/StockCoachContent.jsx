export default function StockCoachContent({ data, code, action, example = false }) {
  return <>
    <p className="mb-3 text-sm font-bold">{data.facts?.name || code} · {data.facts?.investment_style || '성향 미설정'}</p>
    <dl className="grid gap-3 text-sm md:grid-cols-3">
      {[['관찰', 'observation'], ['연습 조언', 'advice'], ['주의할 점', 'caution']].map(([label, key]) => <div key={key} className="rounded-lg bg-gray-50 p-3"><dt className="font-bold">{label}</dt><dd className="mt-2 whitespace-pre-line text-gray-600">{data[key] || '제공된 내용이 없습니다.'}</dd></div>)}
    </dl>
    {example && <p className="mt-2 text-xs text-gray-500">튜토리얼 예시문입니다. 실제 AI를 호출하지 않습니다.</p>}
    {action}
  </>;
}
