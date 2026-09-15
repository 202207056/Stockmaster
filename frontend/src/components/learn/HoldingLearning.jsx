import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { learningScope } from '../../utils/learning';
import DecisionNotebook from './DecisionNotebook';

export default function HoldingLearning({ holdings }) {
  const { user, accountId, isAuthenticated } = useAuth();
  if (!isAuthenticated || !accountId || !holdings?.length) return null;
  const scope = learningScope(user?.user_id, accountId);
  return <details className="mt-4 rounded-xl border border-gray-200 p-4" key={scope}><summary className="cursor-pointer text-sm font-bold text-gray-700">보유 중 계획 점검 (선택)</summary><p className="mt-3 text-xs text-gray-500">가격 변화 외에 처음 확인하려던 정보가 바뀌었는지 돌아보세요.</p><div className="mt-3 space-y-3">{holdings.map((holding) => <details key={`${scope}:${holding.symbol_code}`} className="rounded-lg border border-gray-200 p-3"><summary className="cursor-pointer text-sm font-bold">{holding.security_name || holding.symbol_code}</summary><div className="mt-3"><DecisionNotebook key={`${scope}:${holding.symbol_code}`} scope={scope} symbol={holding.symbol_code} mode="보유" /></div></details>)}</div><Link to="/learn?tab=practice" className="mt-3 inline-block text-xs text-brand-700 underline">보유 비중을 가상으로 비교하기</Link></details>;
}
