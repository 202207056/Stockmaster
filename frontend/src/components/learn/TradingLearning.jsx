import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { learningScope } from '../../utils/learning';
import { numberOrNull } from '../../api/normalize';
import { won } from '../../utils/format';
import DecisionNotebook from './DecisionNotebook';

export default function TradingLearning({ symbol, side, quantity, price, cash, busy }) {
  const { user, accountId, isAuthenticated } = useAuth();
  if (!isAuthenticated || !accountId || !symbol) return null;
  const scope = learningScope(user?.user_id, accountId);
  const balance = numberOrNull(cash);
  const total = Number.isSafeInteger(quantity) && quantity > 0 && price !== null && Number.isSafeInteger(price * quantity) ? price * quantity : null;
  return <details key={`${scope}:${symbol}`} className="mt-4 rounded-lg border border-gray-200 p-3"><summary className="cursor-pointer text-sm font-bold text-gray-700">거래 중 학습 도움 (선택)</summary><div className="mt-4 flex flex-col gap-4">
    <p className="text-xs leading-relaxed text-gray-500">접어서 건너뛸 수 있어요. 학습 기록은 주문을 전송하지 않습니다.</p>
    <div className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed"><p>조회 가격 기준 {side} 예상 금액: {total === null ? '계산 불가' : won(total)}</p>{side === '매수' && <p>예상 잔여 현금: {total === null || balance === null ? '계산 불가' : balance < total ? '조회 잔고보다 금액이 큽니다' : won(balance - total)}</p>}<p className="mt-1 text-gray-500">비용 제외. 시세 기준시각을 제공받지 못해 지연 여부를 확인할 수 없습니다. 체결가·확정 잔고는 주문 결과를 확인해 주세요.</p><p className="mt-1 text-gray-500">계좌 전체의 같은 시점 평가액이 없어 종목 비중·매도 후 잔여 수량은 이 패널에서 계산하지 않습니다.</p></div>
    <fieldset disabled={busy} className="min-w-0"><legend className="sr-only">종목 판단 기록</legend><DecisionNotebook key={`${scope}:${symbol}`} scope={scope} symbol={symbol} mode={side} /></fieldset>
    <Link to={`/learn?tab=courses&lesson=${side === '매도' ? 'E2' : 'E1'}`} className="text-xs text-brand-700 underline">나중에 관련 설명 보기</Link>
  </div></details>;
}
