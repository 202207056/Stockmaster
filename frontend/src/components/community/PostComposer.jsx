import { useCallback, useRef, useState } from 'react';
import { ImagePlus, ListChecks, Hash, ReceiptText, X } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useRemote from '../../hooks/useRemote';
import { createPost, fetchStocks, fetchShareableOrders } from '../../api/data';
import { InlineError } from '../common/ErrorState';
import RemoteState from '../common/RemoteState';
import { QuoteCard, TradeCard } from './PostAttachments';

const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:outline-brand-500';

async function readPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG, PNG, WEBP 사진을 선택해 주세요.');
  if (file.size > 10 * 1024 * 1024) throw new Error('원본 사진은 장당 10MB까지 첨부할 수 있어요.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/jpeg', 0.85);
    if (data.length > 1300000) data = canvas.toDataURL('image/jpeg', 0.6);
    if (data.length > 1300000) throw new Error('사진 용량이 너무 커요. 더 작은 사진을 선택해 주세요.');
    return data;
  } finally { bitmap.close(); }
}

export default function PostComposer({ onSaved, initialSymbol = null, quote = null }) {
  const { accountId, accounts } = useAuth();
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [poll, setPoll] = useState(null);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [quoted, setQuoted] = useState(quote);
  const [trade, setTrade] = useState(null);
  const [panel, setPanel] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [tradeAccountId, setTradeAccountId] = useState(accountId);
  const fileInput = useRef(null);
  const stocks = useRemote(useCallback(signal => fetchStocks(query, signal), [query]), panel === 'symbol' && !!query);
  const orders = useRemote(useCallback(signal => fetchShareableOrders(tradeAccountId, signal), [tradeAccountId]), panel === 'trade' && tradeAccountId != null);
  const filledOrders = orders.data?.filter(order => order.status === '체결') || [];
  const photos = async event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    if (files.length + images.length > 4) { setError(new Error('사진은 최대 4장까지 첨부할 수 있어요.')); return; }
    setReading(true); setError(null);
    try { const added = []; for (const file of files) added.push(await readPhoto(file)); setImages(previous => [...previous, ...added]); }
    catch (err) { setError(err); }
    finally { setReading(false); }
  };
  const send = async event => {
    event.preventDefault(); if (busy || reading) return;
    const values = new FormData(event.currentTarget);
    const title = values.get('title').trim(); const content = values.get('content').trim();
    if (!title || !content) { setError(new Error('제목과 내용을 입력해 주세요.')); return; }
    const cleanPoll = poll && { question: poll.question.trim(), options: poll.options.map(value => value.trim()) };
    if (cleanPoll && (!cleanPoll.question || cleanPoll.options.some(value => !value) || new Set(cleanPoll.options).size !== cleanPoll.options.length)) { setError(new Error('투표 질문과 서로 다른 선택지를 입력해 주세요.')); return; }
    setBusy(true); setError(null);
    try { const result = await createPost({ title, content, symbol_code: symbol?.symbol_code || null, images, poll: cleanPoll, trade_id: trade?.order_id || null, quote_post_id: quoted?.post_id || null }); onSaved(result.post_id, symbol); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  };
  return <form onSubmit={send} className="border-t border-gray-100 p-5">
    <fieldset disabled={busy || reading} className="min-w-0 space-y-3">
      <input name="title" aria-label="글 제목" placeholder="이야기의 제목" required maxLength={200} className={fieldClass} />
      <textarea name="content" aria-label="글 내용" placeholder="오늘의 투자 이야기를 나눠 보세요." required maxLength={10000} rows={4} className={fieldClass} />
      {quoted && <div className="space-y-2"><div className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>리포스트 · 내 의견과 함께 인용</span><button type="button" aria-label="인용 삭제" onClick={() => setQuoted(null)}><X size={16} /></button></div><QuoteCard post={quoted} /></div>}
      <div className="flex flex-wrap gap-1 border-t border-gray-100 pt-3">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={photos} className="hidden" aria-label="사진 첨부" />
        <Tool icon={ImagePlus} label="사진" onClick={() => fileInput.current.click()} disabled={images.length >= 4} />
        <Tool icon={ListChecks} label="투표" active={!!poll} onClick={() => setPoll(poll ? null : { question: '', options: ['', ''] })} />
        <Tool icon={Hash} label="종목 태그" active={panel === 'symbol'} onClick={() => setPanel(panel === 'symbol' ? null : 'symbol')} />
        <Tool icon={ReceiptText} label="거래내역" active={panel === 'trade'} onClick={() => setPanel(panel === 'trade' ? null : 'trade')} />
      </div>
      {images.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{images.map((src, index) => <div key={src} className="relative"><img src={src} alt={`첨부 예정 사진 ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" /><button type="button" aria-label={`사진 ${index + 1} 삭제`} onClick={() => setImages(images.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X size={16} /></button></div>)}</div>}
      {poll && <section aria-label="투표 만들기" className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="flex items-center justify-between"><strong className="text-sm">투표 만들기</strong><button type="button" onClick={() => setPoll(null)} aria-label="투표 삭제"><X size={16} /></button></div><input aria-label="투표 질문" placeholder="어떤 의견이 궁금한가요?" required maxLength={200} value={poll.question} onChange={event => setPoll({ ...poll, question: event.target.value })} className={fieldClass} />{poll.options.map((option, index) => <div key={index} className="flex items-center gap-2"><input aria-label={`선택지 ${index + 1}`} placeholder={`선택지 ${index + 1}`} required maxLength={100} value={option} onChange={event => setPoll({ ...poll, options: poll.options.map((value, i) => i === index ? event.target.value : value) })} className={fieldClass} />{poll.options.length > 2 && <button type="button" aria-label={`선택지 ${index + 1} 삭제`} onClick={() => setPoll({ ...poll, options: poll.options.filter((_, i) => i !== index) })}><X size={16} /></button>}</div>)}{poll.options.length < 4 && <button type="button" className="text-sm font-bold text-brand-600" onClick={() => setPoll({ ...poll, options: [...poll.options, ''] })}>+ 선택지 추가</button>}</section>}
      {panel === 'symbol' && <section aria-label="종목 검색" className="space-y-2 rounded-xl border border-gray-200 p-3"><div className="flex gap-2"><input aria-label="종목명 또는 코드" placeholder="종목명 또는 코드" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); setQuery(search.trim()); } }} className={fieldClass} /><button type="button" onClick={() => { if (query === search.trim()) stocks.reload(); else setQuery(search.trim()); }} className="shrink-0 rounded-lg bg-gray-100 px-3 text-sm">검색</button></div>{query && <RemoteState resource={stocks} empty={!stocks.data?.length}><ul className="max-h-48 overflow-y-auto">{stocks.data?.map(stock => <li key={stock.symbol_code}><button type="button" onClick={() => { setSymbol(stock); setPanel(null); }} className="w-full rounded-lg p-2 text-left text-sm hover:bg-brand-50">{stock.name} <span className="text-gray-400">{stock.symbol_code}</span></button></li>)}</ul></RemoteState>}</section>}
      {symbol && <div className="flex items-center gap-2 text-sm text-brand-600"><span className="rounded-full bg-brand-50 px-3 py-1">#{symbol.name}</span><button type="button" aria-label="종목 태그 삭제" onClick={() => setSymbol(null)}><X size={16} /></button></div>}
      {panel === 'trade' && <section aria-label="거래내역 선택" className="space-y-3 rounded-xl border border-gray-200 p-3"><p className="text-sm font-bold">공유할 체결 내역을 선택하세요</p><select aria-label="거래내역 계좌" value={tradeAccountId ?? ''} onChange={event => setTradeAccountId(Number(event.target.value))} className={fieldClass}><option value="" disabled>계좌 선택</option>{accounts.map(account => <option key={account.account_id} value={account.account_id}>{account.account_name}</option>)}</select>{tradeAccountId != null ? <RemoteState resource={orders}><div className="max-h-64 space-y-2 overflow-y-auto">{!filledOrders.length && <p className="py-3 text-sm text-gray-500">첨부할 체결 내역이 없어요.</p>}{filledOrders.map(order => <button key={order.order_id} type="button" className="w-full rounded-xl text-left hover:ring-2 hover:ring-brand-200" onClick={() => { setTrade(order); setPanel(null); }}><TradeCard trade={order} /></button>)}</div></RemoteState> : <p className="text-sm text-gray-500">거래 계좌가 필요해요.</p>}</section>}
      {trade && <div className="space-y-2"><div className="flex justify-between text-xs text-gray-500"><span>종목·매매구분·수량·단가·거래 시각이 게시글에 공개됩니다.</span><button type="button" aria-label="거래내역 삭제" onClick={() => setTrade(null)}><X size={16} /></button></div><TradeCard trade={trade} /></div>}
      <div className="flex items-center justify-between gap-3 pt-2"><span className="text-xs text-gray-400">사진 최대 4장 · 투표 선택지 최대 4개</span><button disabled={busy || reading} className="shrink-0 rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? '등록 중…' : reading ? '사진 처리 중…' : '게시글 등록'}</button></div>
    </fieldset>
    <InlineError error={error} />
  </form>;
}

function Tool({ icon: Icon, label, active, ...props }) {
  return <button type="button" aria-pressed={active} {...props} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${active ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-100 hover:text-brand-600'}`}><Icon size={17} />{label}</button>;
}
