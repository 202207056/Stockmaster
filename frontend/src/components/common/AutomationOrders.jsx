import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useRemote from '../../hooks/useRemote';
import { getToken } from '../../api/client';
import { fetchAutomations, fetchAutomationCapabilities, createAutomation, cancelAutomation, fetchPrice } from '../../api/data';
import { ENABLE_ORDER_SUBMISSION } from '../../config/features';
import { quotePrice } from '../../api/normalize';
import { won } from '../../utils/format';
import { estimateOrderCosts } from '../../utils/orderCosts';
import { automationPayload, automationStatus, formatKorea, koreaInput } from '../../utils/orderAutomations';
import { InlineError } from './ErrorState';
import Modal from './Modal';

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const buttonClass = 'rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500';

export default function AutomationOrders({ code, embedded = false, execution, side, quantity, onLockChange }) {
  const { accountId, account, refresh } = useAuth();
  const token = getToken();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const capabilities = useRemote(useCallback(signal => fetchAutomationCapabilities(signal), []));
  const history = useRemote(useCallback(signal => fetchAutomations(accountId, signal), [accountId]), !!accountId);
  const quote = useRemote(useCallback(signal => fetchPrice(code, signal), [code]), !!code);
  const [form, setForm] = useState(() => ({ kind: 'scheduled', side: '매수', quantity: '1', operator: 'lte', trigger: '',
    scheduled: koreaInput(Date.now() + 3600000), expires: koreaInput(Date.now() + 7 * 86400000) }));
  const [pending, setPending] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    onLockChange?.(busy || uncertain || open);
    return () => onLockChange?.(false);
  }, [busy, uncertain, open, onLockChange]);
  const lock = useRef(false);
  const [cancelling, setCancelling] = useState(null);
  const seenExecutions = useRef(new Set());
  const ready = ENABLE_ORDER_SUBMISSION && capabilities.data?.enabled && !capabilities.error;
  const change = key => event => setForm(previous => ({ ...previous, [key]: event.target.value }));
  const refreshHistory = history.reload;
  const refreshCapabilities = capabilities.reload;
  useEffect(() => {
    const reload = () => { if (document.visibilityState !== 'hidden') { refreshHistory(); refreshCapabilities(); } };
    const timer = setInterval(reload, 30000);
    document.addEventListener('visibilitychange', reload);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', reload); };
  }, [refreshHistory, refreshCapabilities]);
  useEffect(() => {
    let changed = false;
    for (const job of history.data || []) {
      if (job.order_id && !seenExecutions.current.has(job.order_id)) {
        seenExecutions.current.add(job.order_id); changed = true;
      }
    }
    if (changed) { window.dispatchEvent(new Event('orders:changed')); Promise.resolve(refresh()).catch(() => {}); }
  }, [history.data, refresh]);
  const prepare = event => {
    event.preventDefault(); setError(null); setMessage('');
    if (uncertain && pending) { setOpen(true); return; }
    if (!ready || lock.current) return;
    try {
      const payload = automationPayload(embedded ? { ...form, kind: execution, side, quantity } : form, accountId, code, crypto.randomUUID());
      setPending({ payload, token, estimate: estimateOrderCosts(embedded ? side : form.side, quotePrice(quote.data), Number(embedded ? quantity : form.quantity)) });
      setOpen(true);
    } catch (err) { setError(err); }
  };
  const submit = async () => {
    if (lock.current || !pending || (!uncertain && !ready)) return;
    if (pending.token !== getToken()) { setError(new Error('로그인 계정이 바뀌었습니다. 다시 로그인해 주세요.')); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const result = await createAutomation(pending.payload);
      if (!result.automation_id || result.client_request_id !== pending.payload.client_request_id) throw new Error('등록 결과를 확인하지 못했습니다. 같은 등록 내용으로 다시 확인해 주세요.');
      if (!alive.current || pending.token !== getToken()) return;
      setMessage(`등록 #${result.automation_id} · ${automationStatus(result)} · ${result.reason || '서버에 저장했습니다.'}`);
      setUncertain(false); setPending(null); setOpen(false); refreshHistory();
    } catch (err) {
      if (!alive.current || pending.token !== getToken()) return;
      setError(err); setUncertain(!err.response || err.response.status >= 500); refreshHistory();
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const cancel = async id => {
    if (lock.current) return;
    lock.current = true; setCancelling(id); setError(null);
    try {
      await cancelAutomation(id);
      if (alive.current && token === getToken()) setMessage(`등록 #${id} 취소 완료`);
    } catch (err) { if (alive.current && token === getToken()) setError(err); }
    finally { lock.current = false; if (alive.current) { setCancelling(null); refreshHistory(); } }
  };
  const summary = payload => payload.kind === 'scheduled'
    ? `${formatKorea(payload.scheduled_at)} 이후 1회 시장가 ${payload.order_type}`
    : `${won(payload.trigger_price)} ${payload.trigger_operator === 'gte' ? '이상' : '이하'}이면 1회 시장가 ${payload.order_type}`;
  const unavailable = [404, 405].includes(capabilities.error?.response?.status);
  return <section aria-label="예약·조건 설정" className={embedded ? 'space-y-3' : 'rounded-xl border border-gray-200 bg-white p-5'}>
    {!embedded && <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="automation-title" className="font-bold">예약·조건 주문</h2><p className="mt-1 text-sm text-gray-500">미리 정한 시각이나 가격 조건으로 한 번만 모의 주문합니다.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${capabilities.data?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{capabilities.data?.enabled ? '서버 감시 운영 중' : '서버 감시 확인 필요'}</span></div>}
    <p className="mt-3 text-xs leading-relaxed text-gray-500">한국시간 평일 09:00~15:20 · 약 30초마다 최근 체결 시세 확인 · 브라우저 종료 후에도 서버 실행 중이면 감시합니다. 휴장·거래정지·시세 지연 시 보류하며, 만료까지 조건을 확인하지 못하면 종료합니다.</p>
    <p className="mt-1 text-xs text-gray-500">서버 최근 확인: {formatKorea(capabilities.data?.last_cycle_at)} (한국시간)</p>
    {unavailable ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">연결된 서버가 예약·조건 주문을 아직 지원하지 않습니다. 백엔드 업데이트 후 이용할 수 있습니다.</p> : <InlineError error={capabilities.error} />}
    {!capabilities.loading && !capabilities.error && !capabilities.data?.enabled && <p role="status" className="mt-3 text-sm text-amber-800">{capabilities.data?.reason || '현재 서버 감시가 준비되지 않았습니다.'}</p>}
    {!ENABLE_ORDER_SUBMISSION && <p className="mt-3 text-sm text-gray-500">모의 주문 전송이 점검 중이므로 신규 등록은 비활성화되어 있습니다.</p>}
    <form onSubmit={prepare} className="mt-5 space-y-4">
      <p className="text-sm font-bold">{account?.account_name || '계좌 미선택'} · {code || '트레이딩에서 종목을 선택해 주세요'}</p>
      <fieldset disabled={busy || uncertain} className="grid gap-4">
        {!embedded && <><label className="text-sm">등록 방식<select aria-label="자동주문 등록 방식" className={inputClass} value={form.kind} onChange={change('kind')}><option value="scheduled">예약 주문</option><option value="condition">가격 조건</option></select></label>
        <label className="text-sm">매매 구분<select aria-label="자동주문 매매 구분" className={inputClass} value={form.side} onChange={change('side')}><option>매수</option><option>매도</option></select></label>
        <label className="text-sm">수량 (주)<input aria-label="자동주문 수량" className={inputClass} type="number" required min="1" max="1000000" step="1" value={form.quantity} onChange={change('quantity')} /></label></>}
        {(embedded ? execution : form.kind) === 'scheduled' ? <label className="text-sm">실행 시각 (한국시간)<input aria-label="예약 실행 시각" className={inputClass} type="datetime-local" required value={form.scheduled} onChange={change('scheduled')} /></label> : <><label className="text-sm">감시 가격 (원)<input aria-label="감시 가격" className={inputClass} type="number" min="1" max="1000000000" step="1" required value={form.trigger} onChange={change('trigger')} /></label><label className="text-sm">가격 조건<select aria-label="가격 조건" className={inputClass} value={form.operator} onChange={change('operator')}><option value="lte">이하일 때</option><option value="gte">이상일 때</option></select></label></>}
        <label className="text-sm sm:col-span-2">만료 시각 (한국시간 · 최대 30일)<input aria-label="자동주문 만료 시각" className={inputClass} type="datetime-local" required value={form.expires} onChange={change('expires')} /></label>
      </fieldset>
      <p className="text-xs leading-relaxed text-gray-500">실행 방식: 시장가 · 등록 시 현금과 보유 수량을 예약하지 않습니다. 실행 때 잔고가 부족하면 거부됩니다. 감시 가격과 체결가는 다를 수 있으며, 각 등록은 독립적으로 실행됩니다. 장외 예약은 유효기간 내 다음 감시 시각을 기다립니다.</p>
      <button className={buttonClass} disabled={busy || (!uncertain && (!ready || !code || !accountId))}>{uncertain ? '등록 결과 다시 확인' : '예약·조건 내용 확인'}</button>
    </form>
    <InlineError error={!open ? error : null} />
    {message && <p role="status" className="mt-3 text-sm text-brand-700">{message}</p>}
    <details className="mt-6 border-t border-gray-100 pt-4"><summary className="cursor-pointer text-sm font-bold">감시·예약 내역 보기</summary><div className="flex justify-between gap-3"><h3 className="font-bold">감시·예약 내역</h3><button type="button" onClick={() => { refreshHistory(); refreshCapabilities(); }} disabled={history.loading} className="text-sm underline disabled:opacity-50" aria-label="예약 내역 새로고침" title="예약 내역 새로고침"><RefreshCw size={16} aria-hidden="true" /></button></div>
      <InlineError error={unavailable ? null : history.error} />
      {!accountId ? <p className="mt-3 text-sm text-gray-500">계좌를 선택해 주세요.</p> : !history.data?.length ? <p className="py-6 text-center text-sm text-gray-500">{history.loading ? '내역을 불러오는 중…' : history.error ? '예약 내역을 확인할 수 없습니다.' : '등록한 예약·조건 주문이 없습니다.'}</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr>{['번호·종목', '조건·수량', '만료 (한국시간)', '상태', '최근 확인·사유', '관리'].map(label => <th key={label} className="p-3 font-semibold text-gray-500">{label}</th>)}</tr></thead><tbody>{history.data.map(job => <tr key={job.automation_id} className="border-t border-gray-100"><td className="p-3">#{job.automation_id}<br />{job.symbol_code}</td><td className="p-3">{summary(job)}<br />{job.quantity}주</td><td className="p-3">{formatKorea(job.expires_at)}</td><td className="p-3"><span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-bold ${job.status === 'active' ? 'bg-brand-50 text-brand-700' : job.status === 'executed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{automationStatus(job)}</span>{job.order_id && <p className="mt-2 whitespace-nowrap text-xs">체결 주문 #{job.order_id}</p>}</td><td className="max-w-xs p-3 text-xs leading-relaxed">{formatKorea(job.last_checked_at)}{job.last_price != null && ` · ${won(job.last_price)}`}<br />{job.reason}</td><td className="p-3">{job.status === 'active' ? <button type="button" disabled={cancelling !== null || busy || history.loading} onClick={() => cancel(job.automation_id)} className="whitespace-nowrap text-brand-700 underline disabled:opacity-50">{cancelling === job.automation_id ? '취소 중…' : '등록 취소'}</button> : '—'}</td></tr>)}</tbody></table></div>}
      <p className="mt-2 text-xs text-gray-400">활성 등록 우선 최대 200건 · 계좌당 활성 등록 최대 20건 · 화면을 보고 있을 때 30초마다 새로고침</p>
    </details>
    <Modal open={open && !!pending} title="예약·조건 주문 등록 확인" onClose={() => { if (!busy) setOpen(false); }} footer={<><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">닫기</button><button type="button" disabled={busy || (!uncertain && !ready)} onClick={submit} className={buttonClass}>{busy ? '등록 확인 중…' : uncertain ? '같은 등록 결과 확인' : '서버에 등록'}</button></>}>
      {pending && <><p className="font-bold">{account?.account_name} · {pending.payload.symbol_code} {pending.payload.quantity}주</p><p className="mt-2">{summary(pending.payload)}</p><p>만료: {formatKorea(pending.payload.expires_at)} (한국시간)</p>{pending.estimate && <p className="mt-3">현재 조회 시세 기준 예상 수수료 {won(pending.estimate.commission)} · 거래세 {won(pending.estimate.tax)}<br />예상 {pending.payload.order_type === '매수' ? '출금' : '입금'} {won(pending.estimate.settlement)}</p>}<p className="mt-3">등록은 체결이 아닙니다. 서버가 시각·조건을 확인하면 한 번만 시장가로 모의 체결하며 실행 시점의 가격·수수료·잔고를 적용합니다.</p>{uncertain && <p role="status" className="mt-3 text-amber-800">통신 결과가 불명확합니다. 새 주문을 만들지 않고 같은 등록 키로 결과를 확인합니다.</p>}<InlineError error={error} /></>}
    </Modal>
  </section>;
}
