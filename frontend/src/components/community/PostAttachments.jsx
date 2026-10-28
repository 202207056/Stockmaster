import { useRef, useState } from 'react';
import { votePost } from '../../api/data';
import { InlineError } from '../common/ErrorState';

export function TradeCard({ trade }) {
  const sale = trade.order_type === '매도';
  const profit = trade.profit_loss == null ? null : Number(trade.profit_loss);
  const rate = trade.profit_rate == null ? null : Number(trade.profit_rate);
  const hasProfit = Number.isFinite(profit) && Number.isFinite(rate);
  const amount = hasProfit ? Math.round(profit) : null;
  const date = String(trade.filled_at || trade.created_at || '').replace('T', ' ').slice(0, 16);
  return <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
    <div className="flex items-start justify-between gap-3"><strong className="min-w-0 break-words">{trade.name || trade.security_name || '종목명 확인 불가'}</strong><span className={`shrink-0 font-bold ${sale ? 'text-blue-500' : 'text-red-500'}`}>{trade.order_type}</span></div>
    {sale && <p className="mt-2 font-bold text-blue-500" title="매도 당시 평균 매수가 대비 손익 · 수수료 및 세금 제외">{hasProfit ? `${amount > 0 ? '+' : amount < 0 ? '-' : ''}${Math.abs(amount).toLocaleString('ko-KR')}원(${rate.toFixed(1)}%)` : '손익 정보 없음'}</p>}
    <p className="mt-2 text-gray-700">{Number(trade.quantity).toLocaleString()}주 · 주당 {Number(trade.price).toLocaleString()}원</p>
    {!sale && date && <p className="mt-1 text-xs text-gray-400">{date}</p>}
  </div>;
}

export function QuoteCard({ post }) {
  return <a href={`/community?post=${post.post_id}`} className="block rounded-xl border border-gray-200 bg-gray-50/60 p-4 hover:border-brand-300"><p className="text-xs font-semibold text-gray-500">{post.author_name}님의 글 인용</p><p className="mt-2 break-words text-sm font-bold text-gray-800">{post.title}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-500">{post.content}</p></a>;
}

export default function PostAttachments({ post, onChanged, authenticated = true, showSymbol = true }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [photo, setPhoto] = useState(null);
  const viewer = useRef(null);
  const attachments = post.attachments || {};
  const poll = attachments.poll;
  const vote = async index => {
    if (busy || !authenticated) return;
    setBusy(true); setError(null);
    try { await votePost(post.post_id, index); onChanged(); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  };
  return <div className="mt-3 space-y-3">
    {!!attachments.images?.length && <div className={`grid gap-2 ${attachments.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>{attachments.images.map((src, index) => <button type="button" key={index} onClick={() => { setPhoto(src); viewer.current.showModal(); }} aria-label={`첨부 사진 ${index + 1} 크게 보기`}><img src={src} alt={`게시글 첨부 사진 ${index + 1}`} loading="lazy" className="max-h-96 w-full rounded-xl border border-gray-100 object-contain" /></button>)}</div>}
    <dialog ref={viewer} aria-label="첨부 사진 크게 보기" className="fixed inset-0 m-auto max-h-[90vh] max-w-[95vw] rounded-xl bg-white p-3 backdrop:bg-black/70"><button type="button" onClick={() => viewer.current.close()} className="mb-2 rounded-lg px-3 py-2 text-sm font-bold">닫기</button>{photo && <img src={photo} alt="확대된 첨부 사진" className="max-h-[75vh] max-w-full object-contain" />}</dialog>
    {showSymbol && post.symbol_code && <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">#{attachments.symbol_name || post.symbol_code}</span>}
    {attachments.trade && <TradeCard trade={attachments.trade} />}
    {attachments.quote && <QuoteCard post={attachments.quote} />}
    {poll && <fieldset disabled={busy || !authenticated} className="space-y-2 rounded-xl border border-gray-200 p-4"><legend className="px-1 text-sm font-bold text-gray-900">{poll.question}</legend>
      {poll.options.map((option, index) => { const percent = poll.total ? Math.round((poll.counts[index] / poll.total) * 100) : 0; return <button key={index} type="button" aria-pressed={poll.selected === index} onClick={() => vote(index)} className={`relative flex w-full overflow-hidden rounded-lg border px-3 py-3 text-left text-sm disabled:cursor-not-allowed ${poll.selected === index ? 'border-brand-500 font-bold text-brand-700' : 'border-gray-200 text-gray-700 hover:border-brand-300'}`}><span aria-hidden="true" className="absolute inset-y-0 left-0 bg-brand-50" style={{ width: `${percent}%` }} /><span className="relative min-w-0 flex-1 break-words">{poll.selected === index ? '✓ ' : ''}{option}</span><span className="relative ml-2 shrink-0 text-xs">{percent}% · {poll.counts[index]}표</span></button>; })}
      <p className="text-xs text-gray-400">{poll.total}명 참여 · {poll.selected != null ? '선택을 변경할 수 있어요' : '항목을 눌러 투표해 주세요'}</p>
    </fieldset>}
    <InlineError error={error} />
  </div>;
}
