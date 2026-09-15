import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { learningScope } from '../../utils/learning';
import { numberOrNull } from '../../api/normalize';
import { won } from '../../utils/format';
import DecisionNotebook from './DecisionNotebook';
import TradeScenario from './TradeScenario';

export default function TradingLearning({ symbol, side, quantity, price, cash, busy }) {
  const { user, accountId, isAuthenticated } = useAuth();
  if (!isAuthenticated || !accountId || !symbol) return null;
  const scope = learningScope(user?.user_id, accountId);
  const balance = numberOrNull(cash);
  const total = Number.isSafeInteger(quantity) && quantity > 0 && price !== null && Number.isSafeInteger(price * quantity) ? price * quantity : null;
  return <details key={`${scope}:${symbol}`} className="mt-4 rounded-lg border border-gray-200 p-3"><summary className="cursor-pointer text-sm font-bold text-gray-700">{side === '매수' ? '매수 전 판단 점검' : '매도 전 판단 점검'}</summary><div className="mt-4 flex flex-col gap-4">
    <p className="text-xs leading-relaxed text-gray-500">접어서 건너뛸 수 있어요. 학습 기록은 주문을 전송하지 않습니다.</p>
    <div className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed"><p>조회 가격 기준 {side} 예상 금액: {total === null ? '계산 불가' : won(total)}</p>{side === '매수' && <p>예상 잔여 현금: {total === null || balance === null ? '계산 불가' : balance < total ? '조회 잔고보다 금액이 큽니다' : won(balance - total)}</p>}<p className="mt-1 text-gray-500">비용 제외. 시세 기준시각을 제공받지 못해 지연 여부를 확인할 수 없습니다. 체결가·확정 잔고는 주문 결과를 확인해 주세요.</p><p className="mt-1 text-gray-500">계좌 전체의 같은 시점 평가액이 없어 종목 비중·매도 후 잔여 수량은 이 패널에서 계산하지 않습니다.</p></div>
    {side === '매수' && <details className="rounded-lg border border-gray-200 p-3"><summary className="cursor-pointer text-sm font-bold text-gray-700">가상 사례로 매수 이후까지 확인하기</summary><div className="mt-4"><p className="mb-4 text-sm text-gray-500">근거를 먼저 적고 체결·가격 하락·부분 매도 후 결과를 비교합니다. 수익 여부와 판단 근거를 구분한 뒤, 아래에서 현재 종목의 확인 사항을 남겨 보세요. 사례는 현재 종목의 전망이 아닙니다.</p><fieldset disabled={busy} className="min-w-0"><legend className="sr-only">가상 거래 연습</legend><TradeScenario scope={learningScope(user?.user_id)} /></fieldset></div></details>}
    <fieldset disabled={busy} className="min-w-0"><legend className="sr-only">종목 판단 기록</legend><DecisionNotebook key={`${scope}:${symbol}`} scope={scope} symbol={symbol} mode={side} /></fieldset>
    <Link to={`/learn?tab=courses&lesson=${side === '매도' ? 'E2' : 'E1'}`} className="text-xs text-brand-700 underline">나중에 관련 설명 보기</Link>
  </div></details>;
}
