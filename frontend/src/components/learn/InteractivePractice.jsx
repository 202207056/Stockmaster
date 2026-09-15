import { useState } from 'react';
import { won, wonSigned, signTextClass } from '../../utils/format';
import { partialSale } from '../../utils/learning';
import { LearningButton, LearningField, SimulationLabel } from './LearningUI';
import AllocationPractice from './AllocationPractice';

const inputClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';

function Value({ title, value }) { return <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{title}</p><p className="tabular mt-1 font-bold">{value}</p></div>; }

export default function InteractivePractice({ type, onEvidence }) {
  const [amount, setAmount] = useState(30);
  const [change, setChange] = useState(0);
  const [selection, setSelection] = useState('');
  const [memo, setMemo] = useState('');
  const [copied, setCopied] = useState(false);
  if (type === 'allocation') return <AllocationPractice />;
  let body;
  if (type === 'account') {
    const cost = amount * 10_000; const market = cost * (1 + change / 100);
    body = <><LearningField label={`가상 매수 금액: ${amount}만원`}><input type="range" min="0" max="100" step="10" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="accent-brand-600" /></LearningField><LearningField label={`매수 후 주가 변화: ${change}%`}><input type="range" min="-30" max="30" step="10" value={change} onChange={(e) => setChange(Number(e.target.value))} className="accent-brand-600" /></LearningField><div className="grid gap-2 sm:grid-cols-3"><Value title="현금" value={won(1_000_000 - cost)} /><Value title="주식 평가액" value={won(market)} /><Value title="총자산" value={won(1_000_000 - cost + market)} /></div><p>가격 변화가 없으면 현금이 주식으로 바뀔 뿐 총자산은 같습니다.</p></>;
  } else if (type === 'sale') {
    const qty = Math.min(amount, 30); const result = partialSale(qty);
    body = <><p>10,000원에 매수한 30주 · 현재가 9,000원 · 현금 700,000원</p><LearningField label={`매도 수량: ${qty}주 (0주는 매도하지 않음)`}><input type="range" min="0" max="30" step="10" value={qty} onChange={(e) => setAmount(Number(e.target.value))} className="accent-brand-600" /></LearningField><div className="grid gap-2 sm:grid-cols-3"><Value title="매도 후 현금" value={won(result.cash)} /><Value title="남은 주식" value={`${result.remaining}주`} /><Value title="총자산" value={won(result.total)} /></div><p className={signTextClass(result.realized)}>실현손익 {wonSigned(result.realized)} · 남은 평가손익 {wonSigned(result.unrealized)}</p><p>매도 수량이 바뀌면 남은 노출이 달라집니다. 수량 선택 자체에는 정답이 없습니다.</p></>;
  } else if (type === 'limit') {
    const limit = selection || '9900';
    body = <><p>매도호가 10,000원에 10주가 있다고 가정합니다. 내 매수 수량은 1주입니다.</p><LearningField label="지정 매수 가격"><select value={limit} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="9900">9,900원</option><option value="10000">10,000원</option><option value="10100">10,100원</option></select></LearningField><p role="status" className="rounded-lg bg-brand-50 p-3">{Number(limit) < 10000 ? '조건이 맞지 않아 대기합니다.' : '이 가상 호가에서는 10,000원에 체결 가능한 조건입니다.'}</p><p>단순화한 교육 모델입니다. 실제 대기열·시세 변화·체결 보장은 포함하지 않습니다.</p></>;
  } else if (type === 'depth') {
    const qty = Number(selection || 20); const cost = Math.min(qty, 10) * 10000 + Math.max(qty - 10, 0) * 10100;
    body = <><p>매도호가: 10,000원에 10주 / 10,100원에 20주</p><LearningField label={`가상 매수 수량: ${qty}주`}><input type="range" min="1" max="30" value={qty} onChange={(e) => setSelection(e.target.value)} className="accent-brand-600" /></LearningField><Value title="총 체결금액 / 평균 체결가" value={`${won(cost)} / ${(cost / qty).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`} /><p>수량이 첫 호가의 공급량을 넘으면 다음 가격에서도 거래하는 예시입니다.</p></>;
  } else if (type === 'recovery') {
    const fall = Number(selection || 20); const base = 100 * (1 - fall / 100);
    body = <><LearningField label={`100에서 ${fall}% 하락한 뒤 같은 비율 상승`}><input type="range" min="10" max="50" step="10" value={fall} onChange={(e) => setSelection(e.target.value)} className="accent-brand-600" /></LearningField><Value title="가격 경로" value={`100 → ${base} → ${(base * (1 + fall / 100)).toFixed(1)}`} /><p>원금 회복에 필요한 상승률: {((100 / base - 1) * 100).toFixed(1)}%. 상승률을 적용하는 기준금액이 달라집니다.</p></>;
  } else if (type === 'average') {
    const qty = Number(selection || 10); const cost = 100000 + 8000 * qty;
    body = <><p>기존 10,000원 × 10주에 8,000원으로 추가 매수합니다.</p><LearningField label={`추가 매수: ${qty}주`}><input type="range" min="0" max="30" step="5" value={qty} onChange={(e) => setSelection(e.target.value)} className="accent-brand-600" /></LearningField><div className="grid gap-2 sm:grid-cols-3"><Value title="평균 매입가" value={won(cost / (10 + qty))} /><Value title="총매입금액" value={won(cost)} /><Value title="현재 평가액" value={won((10 + qty) * 8000)} /></div><p>평균 매입가는 낮아질 수 있지만 투자한 금액은 늘어납니다.</p></>;
  } else if (type === 'shock') {
    body = <><p>각 종목에 10만원씩 보유합니다. 가상 묶음 A는 같은 업종, B는 다른 조건의 기업들입니다.</p><LearningField label="교육용 충격 시나리오"><select value={selection || 'industry'} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="industry">특정 업종 충격</option><option value="market">시장 전체 충격</option></select></LearningField><p className="rounded-lg bg-gray-50 p-3">{selection === 'market' ? 'A: −10%, −10%, −10% → −30,000원 / B: −10%, −10%, −10% → −30,000원' : 'A: −10%, −10%, −10% → −30,000원 / B: −10%, 0%, +5% → −5,000원'}</p><p>미리 정한 가상 수익률입니다. 한 사례의 결과를 모든 상황에 일반화하지 않습니다.</p></>;
  } else if (type === 'evidence') {
    body = <><p className="rounded-lg bg-gray-50 p-3">가상 기사 · 실습 1일차: X기업 매출 +20%, 영업이익 −10%.</p><LearningField label="자료에서 확인되는 사실"><select value={selection} onChange={(e) => { setSelection(e.target.value); setCopied(false); }} className={inputClass}><option value="">선택해 주세요</option><option value="매출은 늘고 영업이익은 줄었다">매출은 늘고 영업이익은 줄었다</option><option value="주가가 반드시 오른다">주가가 반드시 오른다</option><option value="영업이익도 증가했다">영업이익도 증가했다</option></select></LearningField>{selection && <p role="status">{selection.startsWith('매출') ? '자료가 뒷받침하는 사실입니다. 이익 감소의 원인은 더 확인해야 합니다.' : '제시된 기사만으로 뒷받침되지 않습니다. 두 숫자를 다시 살펴보세요.'}</p>}<LearningField label="더 확인하고 싶은 정보"><textarea maxLength={300} rows={2} value={memo} onChange={(e) => { setMemo(e.target.value); setCopied(false); }} className={inputClass} placeholder="예: 이익 감소의 원인" /></LearningField>{onEvidence && <div><LearningButton disabled={!selection.startsWith('매출') || !memo.trim()} onClick={() => { onEvidence(`${selection}. 추가 확인: ${memo.trim()}`); setCopied(true); }}>가상 판단 메모로 가져오기</LearningButton>{copied && <p role="status" className="mt-2 text-xs">가상 거래 연습의 매수 근거에 반영했습니다. 실제 주문은 생성하지 않습니다.</p>}</div>}</>;
  } else if (type === 'context') {
    body = <><p>가상 X·Y기업 모두 이익 +10%. X는 발표 전 기대 +20%, Y는 기대 +5%였습니다.</p><LearningField label="확인할 정보"><select value={selection} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="">자료를 선택해 보세요</option><option value="before">발표 전 기대치와 공개 시각</option><option value="after">발표 후에 나온 분석</option></select></LearningField>{selection && <p role="status">{selection === 'before' ? '같은 증가율이라도 당시 기대와의 관계가 다릅니다. 주가 반응은 별도 정보가 필요합니다.' : '나중에 나온 분석은 당시 알고 있던 근거와 구분해 기록합니다.'}</p>}</>;
  } else if (type === 'metric') {
    body = <><p>가상 X: PER 8, 일회성 자산매각 이익 포함. 가상 Y: PER 15, 반복 영업이익 중심. 업종도 다릅니다.</p><LearningField label="다음에 살펴볼 항목"><select value={selection} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="">선택해 주세요</option><option value="earnings">반복 가능한 이익과 업종 비교</option><option value="price">PER 숫자만 비교</option></select></LearningField>{selection && <p role="status">{selection === 'earnings' ? '이익이 지속 가능한지와 비교 가능한 기업인지 확인합니다.' : '한 숫자만으로 기업의 차이를 모두 설명하기 어렵습니다.'}</p>}</>;
  } else {
    body = <><p>{type === 'hindsight' ? '같은 “매출 증가” 근거로 선택했지만 한 가상 거래는 수익, 다른 거래는 손실이 났습니다. 당시 이익 감소 자료도 공개돼 있었습니다.' : '뉴스를 보고 가상 거래를 고민합니다. 가격 변화 외에 어떤 정보를 다시 확인할까요?'}</p><LearningField label="지금의 판단"><select value={selection} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="">선택해 주세요</option><option>추가 정보 확인</option><option>계획 유지</option><option>계획 수정</option><option>판단 보류</option></select></LearningField><LearningField label="선택 이유 또는 다음 확인 사항"><textarea rows={3} maxLength={300} value={memo} onChange={(e) => setMemo(e.target.value)} className={inputClass} /></LearningField>{memo.trim() && <p className="rounded-lg bg-gray-50 p-3">확인한 사실·불확실한 점·다시 볼 조건을 구분했는지 살펴보세요. 선택 자체에는 정답을 매기지 않습니다.</p>}{onEvidence && <LearningButton disabled={!selection || !memo.trim()} onClick={() => { onEvidence(`${selection}: ${memo.trim()}`); setCopied(true); }}>가상 판단 메모로 가져오기</LearningButton>}{copied && <p role="status">가상 거래 메모에 반영했습니다.</p>}</>;
  }
  return <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-600"><div><SimulationLabel /></div>{body}</div>;
}
