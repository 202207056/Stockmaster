import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { won } from '../../utils/format';
import { InlineError } from './ErrorState';

export default function OrderDialog({ order, result, busy, uncertain, error, message, onClose, onConfirm }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  const completed = !!result;
  const rows = [
    ['계좌번호', order.accountNumber || `미제공 · 모의 계좌 ID ${order.accountId}`],
    ['계좌명', order.accountName],
    ['주문구분', order.kind],
    ['매매구분', '미구현'],
    ['종목', `${order.name} (${order.code})`],
    ['주문수량', `${completed ? result.quantity : order.quantity}주`],
    [completed ? '체결가격' : '주문가격 (예상)', won(completed ? result.price : order.price)],
    [completed ? '거래금액' : '거래금액 (예상)', won(completed ? Number(result.price) * Number(result.quantity) : order.price * order.quantity)],
  ];
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl backdrop:bg-slate-900/50">
    <header className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-bold text-brand-600">모의투자</p><h2 id={titleId} className="text-xl font-extrabold">{completed ? '주문 완료!' : uncertain ? '주문 결과 확인 필요' : `${order.kind} 주문확인`}</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="주문 창 닫기" className="rounded px-2 py-1 text-gray-500 disabled:opacity-40">✕</button></header>
    <dl className="divide-y divide-gray-100">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-gray-500">{label}</dt><dd className="break-words text-right font-semibold">{value || '—'}</dd></div>)}</dl>
    {!completed && <p className="my-4 text-xs leading-relaxed text-gray-500">주문가격과 거래금액은 확인 시점의 예상값입니다. 실제 체결가는 주문 처리 시 조회한 현재가로 결정됩니다.</p>}
    <InlineError error={error} />
    {message && <p role="status" className="my-3 text-sm leading-relaxed">{message}</p>}
    {completed ? <section className="mt-5 border-t border-gray-200 pt-5"><h3 className="font-bold">거래 후 함께 살펴보세요</h3><div className="mt-3 grid gap-3"><a href={`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(`${order.name} ${order.code}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-brand-50 p-4 text-sm font-bold text-brand-700">이 주식 관련 뉴스 보기 <span className="block pt-1 text-xs font-normal">네이버 뉴스 검색 · 새 탭</span></a><Link to={`/learn?tab=courses&lesson=${order.kind === '매수' ? 'A1' : 'C2'}`} className="rounded-xl border border-gray-200 p-4 text-sm font-bold">관련 개념 살펴보기<span className="block pt-1 text-xs font-normal text-gray-500">{order.kind === '매수' ? '현금이 줄면 손해일까?' : '전량 매도와 일부 매도는 무엇이 다를까?'}</span></Link><Link to="/learn?tab=courses&lesson=D1" className="text-sm text-brand-700 underline">좋은 뉴스면 가격도 오를까?</Link></div><button type="button" onClick={onClose} className="mt-5 w-full rounded-lg bg-brand-600 py-3 font-bold text-white">확인</button></section> : <div className="mt-5 flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-3 font-bold">{uncertain ? '닫고 주문내역 확인' : '취소'}</button>{!uncertain && <button type="button" disabled={busy} onClick={onConfirm} className="flex-1 rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-50">{busy ? '주문 처리 중…' : `${order.kind}주문`}</button>}</div>}
  </dialog>;
}
