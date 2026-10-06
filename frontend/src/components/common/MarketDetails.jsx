import { useCallback, useId, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { fetchChart } from '../../api/data';
import { requireArray, requireObject } from '../../api/normalize';
import useRemote from '../../hooks/useRemote';
import RemoteState from './RemoteState';
import './MarketDetails.css';

const tabs = [['orderbook', '호가'], ['trades', '체결'], ['daily', '일별']];
const number = value => value == null ? '—' : Number(value).toLocaleString('ko-KR');

export default function MarketDetails({ code }) {
  const [tab, setTab] = useState('orderbook');
  const id = useId();
  return <section className="market-details" aria-label="종목 시장 정보">
    <div className="market-details-tabs" role="tablist" aria-label="시장 정보 구분">{tabs.map(([value, label], index) => <button key={value} id={`${id}-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls={`${id}-panel`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next !== null) { event.preventDefault(); setTab(tabs[next][0]); document.getElementById(`${id}-${tabs[next][0]}`)?.focus(); }
    }}>{label}</button>)}</div>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}>
      {code ? <MarketContent key={`${code}:${tab}`} code={code} tab={tab} /> : <p className="market-details-empty">종목을 선택하면 시장 정보를 확인할 수 있어요.</p>}
    </div>
  </section>;
}

async function loadDetails(code, tab, signal) {
  if (tab === 'daily') return { rows: (await fetchChart(code, signal, 'D')).map((row, index, rows) => ({ ...row, change: index && rows[index - 1].close > 0 ? (row.close / rows[index - 1].close - 1) * 100 : null })).reverse() };
  const data = requireObject((await api.get(`/stocks/${encodeURIComponent(code)}/${tab}`, { signal })).data);
  if (tab === 'orderbook') { requireArray(data.asks); requireArray(data.bids); }
  else requireArray(data.rows);
  return data;
}

function MarketContent({ code, tab }) {
  const resource = useRemote(useCallback(signal => loadDetails(code, tab, signal), [code, tab]));
  const data = resource.data;
  const empty = tab === 'orderbook' ? !data?.asks.length && !data?.bids.length : !data?.rows.length;
  return <>
    <div className="market-details-meta"><span>{tab === 'daily' ? '일별 가격 · 원 / 주' : 'KRX · 원 / 주'}</span><button type="button" aria-label={`${tabs.find(([value]) => value === tab)[1]} 새로고침`} disabled={resource.loading} onClick={resource.reload}><RefreshCw size={12} />{resource.loading ? '조회 중' : '새로고침'}</button></div>
    <RemoteState resource={resource} requiresAuth={false}>
      {data && empty && <div role="status" className="market-details-empty"><p className="font-semibold">{tab === 'orderbook' ? '현재 제공되는 매수·매도 호가가 없습니다.' : tab === 'trades' ? '현재 제공되는 시장 체결 내역이 없습니다.' : '현재 제공되는 일별 가격이 없습니다.'}</p><p className="mt-2">{tab === 'daily' ? '잠시 후 다시 조회해 주세요.' : '조회는 완료됐지만 시세 제공처가 빈 데이터를 반환했습니다. 장 시작 전·휴장 또는 시세 제공 지연일 수 있습니다. 장중에도 계속 비어 있으면 시세 연결을 확인해야 합니다.'}</p><button type="button" onClick={resource.reload} className="mt-3 text-brand-700 underline">다시 조회</button></div>}
      {data && !empty && <div className="market-details-scroll">{tab === 'orderbook' ? <DepthTable data={data} /> : <table><thead><tr>{(tab === 'trades' ? ['체결시간', '체결가', '체결량'] : ['날짜', '종가', '등락률', '거래량']).map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.rows.map((row, index) => tab === 'trades' ? <tr key={`${row.time}-${index}`}><td>{row.time}</td><td className="font-semibold">{number(row.price)}</td><td>{number(row.quantity)}</td></tr> : <tr key={row.date}><td title={row.date}>{row.date.slice(2).replaceAll('-', '.')}</td><td className="font-semibold">{number(row.close)}</td><td>{row.change == null ? '—' : `${row.change > 0 ? '+' : ''}${row.change.toFixed(2)}%`}</td><td>{number(row.volume)}</td></tr>)}</tbody></table>}</div>}
    </RemoteState>
    <p className="market-details-footnote">{tab === 'daily' ? '최근 거래일 기준 · 당일 값은 장중 변동될 수 있습니다.' : `${data?.market_time ? `호가 접수 ${data.market_time} · ` : ''}조회 시점 데이터 · 자동 갱신되지 않습니다.`}{data?.observed_at && Number.isFinite(Date.parse(data.observed_at)) && <span className="block">조회: {new Date(data.observed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국시간)</span>}</p>
  </>;
}

function DepthTable({ data }) {
  const asks = [...data.asks].sort((a, b) => b.price - a.price);
  const bids = [...data.bids].sort((a, b) => b.price - a.price);
  const max = Math.max(1, ...asks.map(row => row.quantity), ...bids.map(row => row.quantity));
  return <table className="market-depth"><thead><tr><th scope="col">매도잔량</th><th scope="col">호가</th><th scope="col">매수잔량</th></tr></thead><tbody>{[['ask', asks], ['bid', bids]].flatMap(([side, rows]) => rows.map(row => <tr key={`${side}-${row.level}`} className={`market-depth-${side}`}><td>{side === 'ask' && <><span className="market-depth-bar" style={{ width: `${row.quantity / max * 100}%` }} /><span className="relative">{number(row.quantity)}</span></>}</td><td className="market-depth-price">{number(row.price)}</td><td>{side === 'bid' && <><span className="market-depth-bar" style={{ width: `${row.quantity / max * 100}%` }} /><span className="relative">{number(row.quantity)}</span></>}</td></tr>))}</tbody><tfoot><tr><td>{number(asks.reduce((sum, row) => sum + row.quantity, 0))}</td><th scope="row">표시 잔량</th><td>{number(bids.reduce((sum, row) => sum + row.quantity, 0))}</td></tr></tfoot></table>;
}
