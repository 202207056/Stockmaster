import { useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import useRemote from '../../hooks/useRemote';
import { fetchCoach } from '../../api/data';
import RemoteState from './RemoteState';
import StockCoachContent from './StockCoachContent';

export default function StockCoach({ code }) {
  const { isAuthenticated } = useAuth();
  const resource = useRemote(useCallback((signal) => fetchCoach(code, signal), [code]), isAuthenticated && !!code);
  return <section className="rounded-xl border border-gray-200 p-4 lg:col-span-4">
    <h2 className="mb-3 text-sm font-bold text-gray-700">AI 모의투자 코칭</h2>
    <RemoteState resource={resource} authenticated={isAuthenticated}>
      {resource.data && <StockCoachContent data={resource.data} code={code} />}
    </RemoteState>
  </section>;
}
