import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchStocks } from '../../api/data';

export default function StockSearch() {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState({ query: '', rows: [], error: false });
  const keyword = query.trim();
  const ready = result.query === keyword;
  const rows = ready ? result.rows : [];

  useEffect(() => {
    if (!keyword || !open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await fetchStocks(keyword, controller.signal);
        if (!controller.signal.aborted) setResult({ query: keyword, rows: data.slice(0, 8), error: false });
      } catch {
        if (!controller.signal.aborted) setResult({ query: keyword, rows: [], error: true });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [keyword, open]);

  const select = (stock) => {
    setOpen(false);
    setActive(-1);
    navigate(`/trading?${new URLSearchParams({ search: keyword, ...(stock ? { code: stock.symbol_code } : {}) })}`);
  };

  return <form className="relative" role="search" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onSubmit={event => { event.preventDefault(); if (keyword) select(rows[active]); }}>
    <input type="search" name="search" role="combobox" aria-label="종목 검색" aria-autocomplete="list" aria-expanded={open && !!keyword} aria-controls={listId}
      aria-activedescendant={open && rows[active] ? `${listId}-${active}` : undefined}
      placeholder="종목명 또는 코드" maxLength={100} value={query}
      onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); }} onFocus={() => setOpen(true)}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) { if (event.key === 'Enter') event.preventDefault(); return; }
        if (event.key === 'Escape') { setOpen(false); setActive(-1); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && rows.length) {
          event.preventDefault(); setOpen(true);
          setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length);
        }
      }}
      className="w-full rounded-full border border-gray-300 bg-white py-2 pr-10 pl-4 text-sm text-gray-700 placeholder:text-gray-400 md:w-56" />
    <button type="submit" aria-label="종목 검색 실행" className="absolute top-1/2 right-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-500"><Search size={16} aria-hidden="true" /></button>
    {open && keyword && <div className="absolute top-full left-0 z-50 mt-2 max-h-[50dvh] w-full overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white shadow-lg">
      <p role="status" className="px-4 py-2 text-xs text-gray-500">{!ready ? '검색 중…' : result.error ? '검색할 수 없습니다. 잠시 후 다시 시도해 주세요.' : rows.length ? '종목을 선택해 거래 화면으로 이동하세요.' : '검색 결과가 없습니다.'}</p>
      <ul id={listId} role="listbox" aria-label="종목 검색 결과">{rows.map((stock, index) => <li key={stock.symbol_code} role="option" id={`${listId}-${index}`} aria-selected={active === index}
        className={active === index ? 'bg-brand-50' : 'hover:bg-gray-50'}>
        <button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => select(stock)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm">
          <span className="font-bold text-gray-800">{stock.name}</span><span className="text-xs text-gray-500">{stock.symbol_code}</span>
        </button>
      </li>)}</ul>
    </div>}
  </form>;
}
