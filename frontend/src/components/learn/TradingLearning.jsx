import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { learningScope } from '../../utils/learning';
import DecisionNotebook from './DecisionNotebook';

export default function TradingLearning({ symbol, side, busy }) {
  const { user, accountId, isAuthenticated } = useAuth();
  if (!isAuthenticated || !accountId || !symbol) return null;
  const scope = learningScope(user?.user_id, accountId);
  const context = `${scope}:${symbol}:${side}`;
  const title = side === '매수' ? '매수 전 판단 점검' : '매도 전 판단 점검';
  return <div className="relative mt-4 h-12">
    <details key={context} className="absolute inset-x-0 top-0 rounded-lg border border-gray-200 bg-white open:z-30 open:shadow-lg" onKeyDown={event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }
    }}>
      <summary className="cursor-pointer p-3 text-sm font-bold text-gray-700 focus-visible:outline-2 focus-visible:outline-brand-500">{title}</summary>
      <div className="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto border-t border-gray-200 p-3">
    <fieldset disabled={busy} className="min-w-0"><DecisionNotebook key={`${scope}:${symbol}`} scope={scope} symbol={symbol} mode={side} compact /></fieldset>
    <Link to={`/learn?tab=courses&lesson=${side === '매도' ? 'E2' : 'E1'}`} className="text-xs text-brand-700 underline">판단 근거를 왜 작성하나요?</Link>
      </div>
    </details>
  </div>;
}
