import { useState } from 'react';
import FavoriteButton from '../common/FavoriteButton';
import CandleChart from '../common/CandleChart';
import HelpIcon from './HelpIcon';
import Target from './TutorialTarget';

const stocks = [
  { name: '예시전자', code: '990001', price: 50000 },
  { name: '예시자동차', code: '990002', price: 72000 },
  { name: '예시바이오', code: '990003', price: 28000 },
  { name: '예시에너지', code: '990004', price: 35000 },
];
const periods = { D: '1일', W: '1주', M: '3개월', Y: '1년' };
const chartData = Object.fromEntries(Object.keys(periods).map((period, periodIndex) => {
  const count = [40, 5, 65, 52][periodIndex];
  const rows = Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 8, 22, 0, 0));
    date.setUTCMinutes(date.getUTCMinutes() - (count - index - 1) * [5, 1440, 1440, 10080][periodIndex]);
    const close = Math.round((50000 + Math.sin(index * 0.7) * 900 + (index - count + 1) * (periodIndex + 1) * 35) / 50) * 50;
    const open = close + (index % 2 ? 250 : -300);
    return { date: date.toISOString(), key: date.toISOString(), label: period === 'D' ? `${String(9 + Math.floor(index * 5 / 60)).padStart(2, '0')}:${String(index * 5 % 60).padStart(2, '0')}` : date.toISOString().slice(0, 10), open, close: index === count - 1 ? 50000 : close, high: Math.max(open, close, index === count - 1 ? 50000 : close) + 350, low: Math.min(open, close, index === count - 1 ? 50000 : close) - 250 };
  });
  return [period, rows];
}));

export default function TutorialMarket({ active, advance }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [managing, setManaging] = useState(false);
  const [type, setType] = useState('candle');
  const [period, setPeriod] = useState('D');
  const [notice, setNotice] = useState('');
  const filtered = stocks.filter(stock => stock.name.includes(query) || stock.code.includes(query));
  const choose = (stock) => {
    if (stock.code !== '990001') { setNotice('이번 튜토리얼에서는 예시전자 (990001)를 선택해 주세요.'); return; }
    setSelected(true); setNotice('');
    if (active('stock')) advance();
  };
  return <>
    <aside className="rounded-xl border border-gray-200 p-4 lg:col-span-1">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-gray-700">관심종목</h2><button onClick={() => setManaging(value => !value)} className="text-xs text-gray-400 hover:text-gray-700">관리 &gt;</button></div>
      {favorite ? <ul className="mb-4 divide-y divide-gray-100"><li className="py-2.5"><div className="min-w-0"><button onClick={() => choose(stocks[0])} className="font-bold text-brand-700 hover:underline">예시전자</button><p className="text-xs text-gray-500">50,000원</p></div>{managing && <button onClick={() => setFavorite(false)} className="mt-2 text-xs text-gray-500 underline">관심종목 삭제</button>}</li></ul> : <p className="py-8 text-center text-xs leading-relaxed text-gray-400">담아 둔 종목이 없어요.<br />종목을 담으면 여기에 표시됩니다.</p>}
      <Target active={active('search')}><form className="mb-4 flex gap-2" onSubmit={event => { event.preventDefault(); const next = search.trim(); setQuery(next); setNotice(''); if (active('search') && next && ('예시전자'.includes(next) || '990001'.includes(next))) advance(); else if (active('search')) setNotice('예시 또는 예시전자, 종목 코드 990001로 검색해 주세요.'); }}>
        <input name="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="종목명 또는 코드 검색" placeholder="종목명 또는 코드 검색" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2" maxLength={100} />
        <button className="rounded-lg bg-brand-600 px-5 py-2 font-bold text-white">검색</button>
      </form></Target>
      <h2 className="mb-3 text-sm font-bold text-gray-700">종목 목록</h2>
      <ul className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">{filtered.map(stock => <li key={stock.code}><Target active={active('stock') && stock.code === '990001'}><button disabled={active('search')} onClick={() => choose(stock)} className={`w-full px-2 py-3 text-left text-sm ${selected && stock.code === '990001' ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50'}`}><span className="block font-bold">{stock.name}</span><span className="text-xs text-gray-500">{stock.code}</span></button></Target></li>)}</ul>
      {!filtered.length && <p className="py-4 text-sm text-gray-500">검색 결과가 없습니다. 종목명이나 코드를 다시 입력해 주세요.</p>}
      {notice && <p role="status" className="mt-3 text-xs text-brand-700">{notice}</p>}
    </aside>
    <section className="rounded-xl border border-gray-200 p-4 lg:col-span-2">
      <h2 className="mb-3 flex items-center text-sm font-bold text-gray-700">차트<HelpIcon termId="candle" /></h2>
      {selected && <><div className="mb-5 flex flex-wrap justify-between gap-3"><h3 className="text-lg font-bold">예시전자 <span className="text-sm font-normal text-gray-500">990001</span></h3><Target active={active('favorite')}><FavoriteButton selected={favorite} onClick={() => { setFavorite(value => !value); if (active('favorite') && !favorite) advance(); }} /></Target></div>
        <div className="mb-4 flex flex-wrap items-center gap-3"><p className="text-2xl font-extrabold">50,000원</p><span className="text-sm">+1.01%</span><button className="text-xs text-gray-500 underline" onClick={() => setNotice('예시 시세를 확인했어요. 튜토리얼의 주문 가격은 50,000원으로 고정됩니다.')}>시세 새로고침</button></div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Target active={active('chart-type')}><label className="text-sm text-gray-600">그래프 종류<select value={type} onChange={event => { setType(event.target.value); if (active('chart-type') && event.target.value === 'line') advance(); }} className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2"><option value="candle">캔들</option><option value="line">꺾은선</option></select></label></Target>
          <div role="group" aria-label="차트 표시 기간" className="flex gap-1">{Object.entries(periods).map(([value, label]) => <Target key={value} active={active('chart-period') && value === 'M'}><button type="button" aria-pressed={period === value} onClick={() => { setPeriod(value); if (active('chart-period') && value === 'M') advance(); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${period === value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button></Target>)}</div>
        </div></>}
      {selected ? <CandleChart key={`${period}:${type}`} rows={chartData[period]} type={type} periodLabel={periods[period]} /> : <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-gray-200"><p className="text-center text-sm leading-relaxed text-gray-400">조회할 종목을 선택해 주세요.</p></div>}
      {selected && <p className="mt-3 text-xs text-gray-500">{periods[period]} · {{ D: '5분봉', W: '일봉', M: '일봉', Y: '주봉' }[period]} · {chartData[period].length}개 가격 데이터</p>}
      <p className="mt-3 text-xs text-gray-500">제공된 기간의 데이터만 표시되며, 꺾은선은 각 기간의 종가를 연결합니다. 시세는 자동 갱신되지 않으며 기준시각을 제공받지 못해 지연 여부를 확인할 수 없습니다.</p>
      {active('chart-check') && <div className="mt-4"><Target><button onClick={advance} className="tutorial-action">확인</button></Target></div>}
    </section>
  </>;
}
