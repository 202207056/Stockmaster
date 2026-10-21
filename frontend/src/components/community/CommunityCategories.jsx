import { useCallback, useState } from 'react';
import { Hash, Plus, Search, X, MessagesSquare } from 'lucide-react';
import useRemote from '../../hooks/useRemote';
import { fetchStocks } from '../../api/data';
import RemoteState from '../common/RemoteState';
import { InlineError } from '../common/ErrorState';

export default function CommunityCategories({ categories, onSave, selected, onSelect, authenticated }) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const resource = useRemote(useCallback(signal => fetchStocks(query, signal), [query]), adding && !!query);
  const save = next => {
    try { onSave(next); setError(null); return true; } catch { setError(new Error('카테고리를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.')); return false; }
  };
  return <aside aria-label="종목별 카테고리" className="community-categories">
    <div className="mb-6 flex items-center gap-2"><span className="rounded-lg bg-brand-50 p-2 text-brand-600"><Hash size={18} /></span><h2 className="text-base font-bold text-gray-900">관심 카테고리</h2></div>
    <nav aria-label="종목별 게시글" className="space-y-1">
      <button type="button" onClick={() => onSelect(null)} aria-current={!selected ? 'page' : undefined} className={`community-category ${!selected ? 'is-active' : ''}`}><MessagesSquare size={18} /><span>전체 이야기</span></button>
      {categories.map(stock => <div key={stock.symbol_code} className="group flex items-center gap-1"><button type="button" aria-current={selected === stock.symbol_code ? 'page' : undefined} onClick={() => onSelect(stock)} className={`community-category min-w-0 flex-1 ${selected === stock.symbol_code ? 'is-active' : ''}`}><Hash size={17} className="shrink-0" /><span className="truncate">{stock.name}</span></button><button type="button" onClick={() => { if (save(categories.filter(item => item.symbol_code !== stock.symbol_code)) && selected === stock.symbol_code) onSelect(null); }} aria-label={`${stock.name} 카테고리 삭제`} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={14} /></button></div>)}
    </nav>
    {!categories.length && <p className="my-4 text-xs leading-6 text-gray-400">관심 있는 종목을 추가하고<br />종목별 이야기를 모아 보세요.</p>}
    <button type="button" disabled={!authenticated} aria-expanded={adding} onClick={() => setAdding(value => !value)} className="mt-4 flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40"><Plus size={17} />카테고리 추가</button>
    {adding && <form onSubmit={event => { event.preventDefault(); if (query === search.trim()) resource.reload(); else setQuery(search.trim()); }} className="mt-3 space-y-2">
      <div className="flex items-center rounded-lg border border-gray-200 bg-white"><input aria-label="카테고리 종목 검색" value={search} onChange={event => setSearch(event.target.value)} placeholder="종목명 또는 코드" className="min-w-0 flex-1 bg-transparent p-2 text-sm outline-none" /><button type="submit" aria-label="카테고리 검색" className="p-2 text-gray-500"><Search size={16} /></button></div>
      {query && <RemoteState resource={resource} empty={!resource.data?.length}><ul className="max-h-60 overflow-y-auto rounded-lg border border-gray-100 bg-white">{resource.data?.map(stock => <li key={stock.symbol_code}><button type="button" disabled={categories.some(item => item.symbol_code === stock.symbol_code)} onClick={() => { if (save([...categories, { symbol_code: stock.symbol_code, name: stock.name }])) { setAdding(false); setSearch(''); setQuery(''); } }} className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50 disabled:text-gray-300">{stock.name}<span className="ml-1 text-xs text-gray-400">{stock.symbol_code}</span></button></li>)}</ul></RemoteState>}
    </form>}
    <InlineError error={error} />
  </aside>;
}
