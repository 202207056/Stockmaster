import { won } from '../../utils/format';
import { TRADING_POLICY } from '../../utils/tradingCosts';

export function CostRules({ policy = TRADING_POLICY, onOpen }) {
  return <details onToggle={event => { if (event.currentTarget.open) onOpen?.(); }} className="mt-3 rounded-lg border border-gray-200 p-3 text-xs leading-6 text-gray-600"><summary className="cursor-pointer font-bold">일반주식 수수료·세금 적용 기준 · {policy.verified_on}</summary><p>{policy.commission_basis}</p><p>수수료: 매수·매도 각각 체결대금 × 0.015%. 주문 접수·미체결 취소에는 부과하지 않습니다.</p><p>매도 세금: 코스피 증권거래세 0.05% + 농어촌특별세 0.15%, 코스닥 증권거래세 0.20%. 이익이 아닌 매도대금에 부과하므로 손실 매도에도 발생합니다. 매수에는 이 두 세금을 부과하지 않습니다.</p><p>{policy.rounding}. 이 사이트는 한 주문을 한 번에 체결합니다. 여러 체결의 합산 방식은 증권사별로 다를 수 있습니다.</p><p>일반 상장주식의 온라인 현금 거래 기준입니다. ETF·ETN, 배당소득세, 대주주 등의 양도소득세에는 이 계산을 적용하지 않습니다.</p>{policy.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mr-3 inline-block underline">{source.title} ↗</a>)}</details>;
}

export default function TradingCostBreakdown({ costs, side, confirmed = false }) {
  if (!costs) return <p className="text-xs text-gray-500">비용 정책과 종목 과세 분류 확인 후 금액을 표시합니다.</p>;
  return <dl className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm" aria-label={confirmed ? '실제 차감 비용' : '예상 거래 비용'}>{[
    ['수수료', costs.commission], ['증권거래세', costs.transaction_tax], ['농어촌특별세', costs.rural_tax],
    [side === '매수' ? '총 필요금액' : '순수령액', Math.abs(Number(costs.cash_delta))],
  ].map(([label, value]) => <div className="flex justify-between gap-3" key={label}><dt>{label}{!confirmed && ' (예상)'}</dt><dd className="font-bold">{won(value)}</dd></div>)}</dl>;
}
