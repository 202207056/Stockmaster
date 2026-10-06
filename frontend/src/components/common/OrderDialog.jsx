import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { won } from '../../utils/format';
import { estimateOrderCosts } from '../../utils/orderCosts';
import TutorialTarget from '../learn/TutorialTarget';
import { InlineError } from './ErrorState';

export default function OrderDialog({ order, result, busy, uncertain, error, message, onClose, onConfirm, tutorial = false, instruction, includeCosts = false }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  const completed = !!result;
  const type = result?.price_type || order.priceType || '시장가';
  const limit = type !== '시장가';
  const filled = result?.status === '체결';
  const estimate = estimateOrderCosts(order.kind, order.price, order.quantity);
  const gross = completed ? Number(result.price) * Number(result.quantity) : estimate?.gross;
  const commission = completed ? Number(result.commission ?? 0) : estimate?.commission;
  const tax = completed ? Number(result.tax ?? 0) : estimate?.tax;
  const settlement = order.kind === '매수' ? gross + commission : gross - commission - tax;
  useEffect(() => {
    if (tutorial) dialog.current?.querySelector('.tutorial-target-active button')?.focus({ preventScroll: true });
  }, [tutorial, completed]);
  const rows = [
    ['계좌번호', order.accountNumber || `미제공 · 모의 계좌 ID ${order.accountId}`],
    ['계좌명', order.accountName],
    ['주문구분', order.kind],
    ['매매구분', `${type} · ${tutorial ? '학습용 거래' : type === '시장가' ? '즉시 체결 모의거래' : '모의거래'}`],
    ['종목', `${order.name} (${order.code})`],
    ['주문수량', `${completed ? result.quantity : order.quantity}주`],
    [filled ? '체결가격' : limit ? '지정 가격' : '주문가격 (예상)', won(completed ? result.price : order.price)],
    [completed ? '거래금액' : '거래금액 (예상)', won(completed ? Number(result.price) * Number(result.quantity) : order.price * order.quantity)],
  ];
  if (!tutorial || includeCosts) rows.push(
    [filled ? '수수료' : '수수료 (예상)', won(commission)],
    [filled ? '거래세' : '거래세 (예상)', won(tax)],
    [`${order.fundingType === '미수' ? '총 결제대금' : order.kind === '매수' ? '출금액' : '입금액'}${filled ? '' : ' (예상)'}`, won(settlement)],
  );
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className={`${tutorial ? 'tutorial-order-dialog' : ''} m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${tutorial ? 'backdrop:bg-transparent' : 'backdrop:bg-slate-900/50'}`}>
    <header className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-bold text-brand-600">{tutorial ? '학습 전용 · 예시 주문' : '모의투자'}</p><h2 id={titleId} className="text-xl font-extrabold">{completed ? (result.status === '대기' ? `${order.priceType} 주문 접수` : '주문 완료!') : uncertain ? '주문 결과 확인 필요' : `${order.kind} 주문확인`}</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="주문 창 닫기" className="rounded px-2 py-1 text-gray-500 disabled:opacity-40">✕</button></header>
    <dl className="divide-y divide-gray-100">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-gray-500">{label}</dt><dd className="break-words text-right font-semibold">{value || '—'}</dd></div>)}</dl>
    {!tutorial && limit && !filled && <p role="status" className="my-4 text-sm text-amber-800">{completed ? '주문 접수 · 대기 상태입니다. ' : ''}자동 체결되지 않으며 현금·보유 수량은 변하지 않습니다. 표시 비용은 예상값이고 주문내역에서 체결 확인 또는 취소할 수 있습니다.</p>}
    {!completed && !limit && <p className="my-4 text-xs leading-relaxed text-gray-500">{tutorial ? `이 튜토리얼은 1주 ${won(order.price)}에 체결되는 예시입니다. 실제 계좌에는 주문이 생성되지 않습니다.` : '주문가격과 거래금액은 확인 시점의 예상값입니다. 실제 체결가는 주문 처리 시 조회한 현재가로 결정됩니다.'}</p>}
    {order.fundingType === '미수' && <section className="misu-summary"><strong className="misu-danger">미수 주문 · 결제일까지 부족금을 채워야 합니다.</strong><p>예상 현금 사용 {won(order.margin?.paid)} · 예상 부족금 {won(order.margin?.shortfall)}</p><p>T+2 거래일 17시까지 납부하지 않으면 반대매매 대상이 됩니다. 모두 팔아도 빚이 남을 수 있습니다. 정확한 체결 후 부족금과 날짜는 미수 결제 내역에서 확인하세요.</p></section>}
    <InlineError error={error} />
    {message && !tutorial && <p role="status" className="my-3 text-sm leading-relaxed">{message}</p>}
    {completed ? tutorial ? <div className="mt-5"><TutorialTarget instruction={instruction || { title: '주문 완료', text: message }}><button type="button" onClick={onClose} className="w-full rounded-lg bg-brand-600 py-3 font-bold text-white">확인</button></TutorialTarget></div> : <section className="mt-5 border-t border-gray-200 pt-5"><h3 className="font-bold">거래 후 함께 살펴보세요</h3><div className="mt-3 grid gap-3"><a href={`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(`${order.name} ${order.code}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-brand-50 p-4 text-sm font-bold text-brand-700">이 주식 관련 뉴스 보기 <span className="block pt-1 text-xs font-normal">네이버 뉴스 검색 · 새 탭</span></a><Link to={`/learn?tab=courses&lesson=${order.kind === '매수' ? 'A1' : 'C2'}`} className="rounded-xl border border-gray-200 p-4 text-sm font-bold">관련 개념 살펴보기<span className="block pt-1 text-xs font-normal text-gray-500">{order.kind === '매수' ? '매수와 자산 구성' : '전량 매도와 부분 매도'}</span></Link><Link to="/learn?tab=courses&lesson=D1" className="text-sm text-brand-700 underline">뉴스와 가격 반응</Link></div><button type="button" onClick={onClose} className="mt-5 w-full rounded-lg bg-brand-600 py-3 font-bold text-white">확인</button></section> : <div className="mt-5 flex gap-3"><div className="flex-1"><TutorialTarget active={tutorial && instruction?.event === 'cancelled'} instruction={instruction}><button type="button" disabled={busy} onClick={onClose} className="w-full rounded-lg border border-gray-200 py-3 font-bold">{uncertain ? '닫고 주문내역 확인' : '취소'}</button></TutorialTarget></div>{!uncertain && <div className="flex-1"><TutorialTarget active={tutorial && instruction?.event !== 'cancelled'} instruction={instruction || (tutorial ? { title: `${order.kind} 주문 확인`, text: message } : undefined)}><button type="button" disabled={busy || instruction?.event === 'cancelled'} onClick={onConfirm} className="w-full rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-50">{busy ? '주문 처리 중…' : `${order.kind}주문`}</button></TutorialTarget></div>}</div>}
  </dialog>;
}
