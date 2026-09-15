import { useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import useRemote from '../../hooks/useRemote';
import { fetchCoach } from '../../api/data';
import RemoteState from './RemoteState';

export default function StockCoach({ code }) {
  const { isAuthenticated } = useAuth();
  const resource = useRemote(useCallback((signal) => fetchCoach(code, signal), [code]), isAuthenticated && !!code);
  return <section className="rounded-xl border border-gray-200 p-4 lg:col-span-4">
    <h2 className="mb-3 text-sm font-bold text-gray-700">AI 모의투자 코칭</h2>
    <RemoteState resource={resource} authenticated={isAuthenticated}>
      {resource.data && <>
        <p className="mb-3 text-sm font-bold">{resource.data.facts?.name || code} · {resource.data.facts?.investment_style || '성향 미설정'}</p>
        <dl className="grid gap-3 text-sm md:grid-cols-3">
          {[['관찰', 'observation'], ['연습 조언', 'advice'], ['주의할 점', 'caution']].map(([label, key]) => <div key={key} className="rounded-lg bg-gray-50 p-3"><dt className="font-bold">{label}</dt><dd className="mt-2 whitespace-pre-line text-gray-600">{resource.data[key] || '제공된 내용이 없습니다.'}</dd></div>)}
        </dl>
        <p className="mt-3 text-xs text-gray-500">{resource.data.disclaimer}</p>
        <p className="mt-2 text-xs text-gray-500">보유 정보는 첫 번째 계좌 기준이며, 같은 종목의 코칭은 최대 3분 동안 이전 결과가 표시될 수 있어요.</p>
        <button onClick={resource.reload} className="mt-3 text-xs underline">코칭 다시 조회</button>
      </>}
    </RemoteState>
  </section>;
}
