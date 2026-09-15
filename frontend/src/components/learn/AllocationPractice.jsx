import { useId, useState } from 'react';
import { compareAllocation } from '../../utils/learning';
import { won, wonSigned, signTextClass } from '../../utils/format';
import { LearningButton, LearningField, SimulationLabel } from './LearningUI';
import HelpIcon from './HelpIcon';

export default function AllocationPractice() {
  const id = useId();
  const [weights, setWeights] = useState([80, 20]);
  const [change, setChange] = useState(-10);
  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center gap-2"><SimulationLabel /><span className="text-xs text-gray-500">두 계좌의 총자산 각각 100만원</span></div>
    <p className="text-sm leading-relaxed text-gray-600">같은 종목의 가격이 움직여도, 보유 비중에 따라 계좌의 변화는 달라집니다.<HelpIcon termId="diversification" /></p>
    <LearningField label={`두 계좌에 적용할 주가 변화: ${change > 0 ? '+' : ''}${change}%`}><input id={`${id}-change`} type="range" min="-30" max="30" step="5" value={change} onChange={(e) => setChange(Number(e.target.value))} className="w-full accent-brand-600" /></LearningField>
    <div className="grid gap-4 sm:grid-cols-2">{weights.map((weight, index) => {
      const result = compareAllocation(weight, change);
      return <div key={index} className="min-w-0 rounded-lg border border-gray-200 p-3">
        <LearningField label={`계좌 ${index === 0 ? 'A' : 'B'} 주식 비중: ${weight}%`}><input id={`${id}-${index}`} type="range" min="0" max="100" step="5" value={weight} onChange={(e) => setWeights((previous) => previous.map((v, i) => i === index ? Number(e.target.value) : v))} className="w-full accent-brand-600" /></LearningField>
        <div className="my-3 h-3 overflow-hidden rounded bg-gray-100" aria-hidden="true"><div className="h-full bg-brand-500" style={{ width: `${weight}%` }} /></div>
        <p className="text-xs text-gray-500">주식 {won(result.stock)} · 현금 {won(result.cash)}</p>
        <p aria-live="polite" className={`tabular mt-2 text-lg font-bold ${signTextClass(result.delta)}`}>{wonSigned(result.delta)} <span className="text-sm">({result.rate > 0 ? '+' : ''}{result.rate}%)</span></p>
        <p className="mt-1 text-xs text-gray-500">변경 후 총자산 {won(result.total)}</p>
      </div>;
    })}</div>
    <p className="text-xs leading-relaxed text-gray-500">현금 가치 변화·추가 거래·비용은 제외합니다. 개인에게 적합한 비중을 정하는 도구가 아닙니다.</p>
    <div><LearningButton secondary onClick={() => { setWeights([80, 20]); setChange(-10); }}>비교 초기화</LearningButton></div>
  </div>;
}
