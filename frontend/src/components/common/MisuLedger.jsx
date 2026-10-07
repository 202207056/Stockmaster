import { RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { repayMisu, settleMisu } from '../../api/data';
import { InlineError } from './ErrorState';
import { misuDate } from '../../utils/misu';
import { won } from '../../utils/format';
import './Misu.css';

export default function MisuLedger({ accountId, state, reload, refresh, error, onTutorial }) {
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const requestId = useRef(null);
  const perform = async (payment) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFailure(null);
    let succeeded = false;
    try {
      if (payment) {
        requestId.current ||= crypto.randomUUID();
        await repayMisu(accountId, { amount: Number(amount), client_request_id: requestId.current });
        requestId.current = null; setAmount(''); setConfirm(false); setUncertain(false);
      } else await settleMisu(accountId);
      succeeded = true;
      await Promise.all([reload(), refresh()]);
      window.dispatchEvent(new Event('orders:changed'));
    } catch (err) {
      setFailure(err);
      if (payment && !succeeded && (!err.response || err.response.status >= 500)) setUncertain(true);
      else if (payment) { requestId.current = null; setConfirm(false); }
    } finally { lock.current = false; setBusy(false); }
  };
  const debt = Number(state?.debt || 0);
  return <section className="misu-ledger" aria-label="미수 결제 내역">
    <div className="flex justify-between gap-2"><strong>미수 결제 내역</strong><button type="button" onClick={onTutorial}>위험 체험 다시 보기</button></div>
    <InlineError error={error || failure} />
    {!state ? <p>미수 상태를 확인할 수 없어요.</p> : <>
      <p>남은 부족금 <b>{won(debt)}</b>{debt > 0 && <> · 납부기한 {misuDate(state.due_at)} (한국시간)</>}</p>
      {state.overdue && <p className="misu-danger">기한 경과: 추가 매수가 제한되고, 다음 거래일부터 보유 주식이 반대매매 대상이 됩니다. 팔리지 않거나 모두 팔아도 부족금이 남을 수 있어요.</p>}
      {state.frozen_until && <p className="misu-danger">미수 이용 제한: {misuDate(state.frozen_until)}까지. 상환 후에도 기간은 유지돼요.</p>}
      {Number(state.pending_proceeds) > 0 && <><p>결제 대기 매도대금 <b>{won(state.pending_proceeds)}</b> · 아직 갚은 돈이 아니에요.</p><ul>{state.settlements?.map((item, index) => <li key={index}>{won(item.amount)} → {misuDate(item.available_at)} 결제</li>)}</ul></>}
      {!state.monitor_running && <p className="misu-danger">자동 결제 감시의 정상 작동을 확인하지 못해 미수 주문을 사용할 수 없어요.</p>}
      {debt > 0 && <form onSubmit={event => { event.preventDefault(); if (confirm) perform(true); else setConfirm(true); }}><label>모의 입금액 (원)<input aria-label="미수 상환 모의 입금액" type="number" min="1" max={debt} step="1" required value={amount} disabled={busy || confirm} onChange={event => setAmount(event.target.value)} /></label><button disabled={busy} type="submit">{busy ? '처리 중…' : confirm ? uncertain ? '같은 입금 결과 재확인' : `${won(amount)} 모의 입금 확정` : '모의 입금으로 갚기'}</button>{confirm && !uncertain && <button type="button" disabled={busy} onClick={() => setConfirm(false)}>취소</button>}<small>가상 자금을 추가해 부족금을 갚습니다. 실제 돈이 출금되지 않습니다.</small></form>}
      <button type="button" disabled={busy} onClick={() => perform(false)} aria-label="결제 확인 · 새로고침" title="결제 확인 · 새로고침"><RefreshCw size={16} aria-hidden="true" /></button>
      <p>모의 규칙: 매도대금은 T+2 거래일 17시에 부족금부터 갚습니다. 미납 시 소액 예외 없이 이 계좌의 미수를 30일 제한합니다. 연체 이자·연체료는 계산하지 않습니다.</p>
      <details><summary>실제 제도와 비교 · 근거</summary><p>반대매매는 최근 시세로 필요한 수량을 모의 매도합니다. 실제 시장의 호가 잔량·부분 체결·체결가 차이와 증권사별 처분 순서는 재현하지 않습니다.</p><p><a href="https://regulation.krx.co.kr/contents/RGL/03/03010100/RGL03010100T1.jsp" target="_blank" rel="noreferrer" className="underline">한국거래소 결제 안내</a> · <a href="https://www.myasset.com/myasset/static/notice/260109_01.pdf" target="_blank" rel="noreferrer" className="underline">유안타증권 미수동결 설명</a></p></details>
    </>}
  </section>;
}
