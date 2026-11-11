import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchPopularStocks, fetchStocks } from '../../api/data';
import { API_BASE_URL } from '../../api/client';
import { readResource, resourceKey, writeResource, canRetainResource, removeResource } from '../../api/resourceCache';
import PopularStockRow from './PopularStockRow';
const ranked = rows => [...(rows || [])].sort((a, b) => a.rank - b.rank).slice(0, 10);
const searchKey = query => resourceKey(API_BASE_URL, 'public', JSON.stringify(['stocks', query]));
const popularKey = resourceKey(API_BASE_URL, 'public', 'popular-stocks');

export default function StockSearch() {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState({ query: '', rows: [], error: false });
  const [popular, setPopular] = useState(() => ({ rows: ranked(readResource(popularKey)?.data), status: readResource(popularKey) ? 'ready' : 'loading' }));
  const keyword = query.trim();
  const saved = readResource(searchKey(keyword))?.data;
  const ready = keyword ? result.query === keyword || saved != null : popular.status !== 'loading';
  const rows = keyword ? (result.query === keyword ? result.rows : saved?.slice(0, 8) || []) : popular.rows;

  useEffect(() => {
    if (!open || keyword) return;
    const controller = new AbortController();
    fetchPopularStocks(controller.signal).then(data => {
      if (!controller.signal.aborted) { writeResource(popularKey, data); setPopular({ rows: [...data].sort((a, b) => a.rank - b.rank).slice(0, 10), status: 'ready' }); }
    }).catch(error => {
      if (!controller.signal.aborted) {
        if (!canRetainResource(error)) removeResource(popularKey);
        setPopular({ rows: ranked(readResource(popularKey)?.data), status: 'error' });
      }
    });
    return () => controller.abort();
  }, [open, keyword]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open, listId]);

  useEffect(() => {
    if (!keyword || !open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await fetchStocks(keyword, controller.signal);
        if (!controller.signal.aborted) { writeResource(searchKey(keyword), data); setResult({ query: keyword, rows: data.slice(0, 8), error: false }); }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (!canRetainResource(error)) removeResource(searchKey(keyword));
          setResult({ query: keyword, rows: readResource(searchKey(keyword))?.data?.slice(0, 8) || [], error: true });
        }
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [keyword, open]);

  const select = (stock) => {
    setOpen(false);
    setActive(-1);
    navigate(`/trading?${new URLSearchParams({ ...(keyword ? { search: keyword } : {}), ...(stock ? { code: stock.symbol_code } : {}) })}`);
  };

  return <form className="relative" role="search" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onSubmit={event => { event.preventDefault(); if (open && rows[active]) select(rows[active]); else if (keyword) select(); }}>
    <input type="search" name="search" role="combobox" aria-label="종목 검색" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined}
      aria-activedescendant={open && rows[active] ? `${listId}-${active}` : undefined}
      placeholder="종목명 또는 코드" maxLength={100} value={query}
      onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); }} onFocus={() => { setActive(-1); setOpen(true); }} onClick={() => setOpen(true)}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) { if (event.key === 'Enter') event.preventDefault(); return; }
        if (event.key === 'Escape') { setOpen(false); setActive(-1); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && rows.length) {
          event.preventDefault(); setOpen(true);
          setActive(index => index < 0 ? (event.key === 'ArrowDown' ? 0 : rows.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length);
        }
      }}
      className="w-full rounded-full border border-gray-300 bg-white py-2 pr-10 pl-4 text-sm text-gray-700 placeholder:text-gray-400 md:w-56" />
    <button type="submit" aria-label="종목 검색 실행" className="absolute top-1/2 right-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-500"><Search size={16} aria-hidden="true" /></button>
    {open && <div className="absolute top-full left-0 z-50 mt-2 max-h-[min(36rem,70dvh)] w-full overflow-y-auto overscroll-contain border border-gray-200 bg-white shadow-lg md:w-80">
      {(keyword || !ready || popular.status === 'error' || !rows.length) && <p role="status" className="px-4 py-2 text-xs text-gray-500">{!ready ? (keyword ? '검색 중…' : '불러오는 중…') : (keyword ? result.error : popular.status === 'error') ? '조회할 수 없습니다. 잠시 후 다시 시도해 주세요.' : rows.length ? '종목을 선택해 거래 화면으로 이동하세요.' : (keyword ? '검색 결과가 없습니다.' : '인기 검색어가 없습니다.')}</p>}
      <ul id={listId} role="listbox" className="divide-y divide-gray-200" aria-label={keyword ? '종목 검색 결과' : '인기 검색어 1~10위'}>{rows.map((stock, index) => <li key={stock.symbol_code} role="option" id={`${listId}-${index}`} aria-selected={active === index}
        className={active === index ? 'bg-brand-50' : 'hover:bg-gray-50'}>
        <button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => select(stock)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm">
          {keyword ? <><span className="font-bold text-gray-800">{stock.name}</span><span className="text-xs text-gray-500">{stock.symbol_code}</span></> : <PopularStockRow stock={stock} />}
        </button>
      </li>)}</ul>
    </div>}
  </form>;
}
