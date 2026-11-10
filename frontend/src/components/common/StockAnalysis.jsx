import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import useRemote from '../../hooks/useRemote';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import RemoteState from './RemoteState';
import { consensusLabel, brokerRatingLabel } from '../../utils/stockRatings';
import { formalCompanyOverview } from '../../utils/companyOverview';
import './StockAnalysis.css';

const titles = { earnings: '실적', investors: '투자자 동향', financials: '재무정보', opinions: '투자의견', overview: '기업개요' };
const earningsKeys = ['revenue', 'operating_profit', 'net_income', 'owners_income', 'operating_margin', 'net_margin'];
const financialGroups = { profitability: ['수익성', ['operating_margin', 'net_margin', 'roe']], stability: ['안정성', ['debt_ratio', 'quick_ratio', 'reserve_ratio']], perShare: ['주당 지표', ['eps', 'bps', 'per', 'pbr', 'dividend']] };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const fmt = (value, signed = false) => finite(value) ? `${signed && value > 0 ? '+' : ''}${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}` : '—';
const tone = value => !finite(value) || value === 0 ? '' : value > 0 ? 'stock-analysis-positive' : 'stock-analysis-negative';

export default function StockAnalysis({ code, kind, active = true }) {
  const [period, setPeriod] = useState('annual');
  const [estimates, setEstimates] = useState(true);
  const resource = useRemote(useCallback(async signal => {
    const { data } = await api.get(`/stocks/${encodeURIComponent(code)}/analysis`, {
      signal, ...(import.meta.env.DEV ? { baseURL: '/api' } : {}),
    });
    if (data?.symbol_code !== code) throw new Error('종목 분석 응답을 확인할 수 없습니다.');
    return data;
  }, [code]), true, { cacheKey: JSON.stringify(['stock-analysis', code]), publicCache: true });
  useAutoRefresh(resource, 300_000, active);
  const data = resource.data;
  const finance = data?.[period];
  const periods = finance?.periods?.filter(p => estimates || !p.estimate) ?? [];
  return <section className="stock-analysis" aria-label={titles[kind]}>
    <div className="stock-analysis-toolbar"><h2>{titles[kind]}</h2>
      {(kind === 'earnings' || kind === 'financials') && <>
        <div className="stock-analysis-switch" role="group" aria-label="재무 기간">{[['annual', '연간'], ['quarter', '분기']].map(([key, label]) => <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}>{label}</button>)}</div>
        <label className="stock-analysis-estimates"><input type="checkbox" checked={estimates} onChange={e => setEstimates(e.target.checked)} />추정치 포함</label>
      </>}
    </div>
    <RemoteState resource={resource} requiresAuth={false} autoRefresh>
      {data && <>
        {(kind === 'earnings' || kind === 'financials') && (finance == null ? <Empty unavailable /> : !periods.length || !finance.rows.length ? <Empty /> : kind === 'earnings' ? <>
          <EarningsChart finance={finance} periods={periods} />
          <FinanceTable finance={finance} periods={periods} keys={earningsKeys} caption={`${period === 'annual' ? '연간' : '분기'} 실적`} />
        </> : <Financials finance={finance} periods={periods} />)}
        {kind === 'investors' && <Investors rows={data.investors} />}
        {kind === 'opinions' && <Opinions data={data.opinions} code={code} active={active} />}
        {kind === 'overview' && (data.overview?.length ? <div className="stock-analysis-overview">{data.overview.map((paragraph, index) => <p key={index}>{formalCompanyOverview(paragraph)}</p>)}</div> : <Empty unavailable={data.overview == null} />)}
      </>}
    </RemoteState>
    {data && <div className="stock-analysis-source"><a href={`https://m.stock.naver.com/domestic/stock/${encodeURIComponent(code)}/total`} target="_blank" rel="noopener noreferrer">네이버 증권</a>{resource.error && <span role="status"> · 이전 조회 자료 · 갱신에 실패했습니다.</span>}</div>}
  </section>;
}

function Empty({ unavailable = false }) {
  return <p className="stock-analysis-empty" role="status">{unavailable ? '자료를 불러오지 못했습니다. 잠시 후 자동으로 다시 조회합니다.' : '이 종목은 제공되는 자료가 없습니다.'}</p>;
}

function FinanceTable({ finance, periods, keys, caption }) {
  const rows = keys.map(key => finance.rows.find(row => row.key === key)).filter(Boolean);
  if (!rows.length) return <Empty />;
  return <div className="stock-analysis-table-scroll" tabIndex={0} role="region" aria-label={caption}>
    <table className="stock-analysis-table"><caption className="sr-only">{caption}</caption><thead><tr><th scope="col">항목 / 단위</th>{periods.map(p => <th scope="col" key={p.key} className={p.estimate ? 'stock-analysis-estimate' : ''}>{p.label}{p.estimate && <span className="block">추정</span>}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}><th scope="row">{row.label}<small>{row.unit}</small></th>{periods.map(p => <td key={p.key} className={`${p.estimate ? 'stock-analysis-estimate' : ''} ${finite(row.values[p.key]) && row.values[p.key] < 0 ? 'stock-analysis-negative' : ''}`}>{fmt(row.values[p.key])}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

function Financials({ finance, periods }) {
  const [group, setGroup] = useState('profitability');
  return <><div className="stock-analysis-subfilters" role="group" aria-label="재무 항목">{Object.entries(financialGroups).map(([key, [label]]) => <button type="button" aria-pressed={group === key} key={key} onClick={() => setGroup(key)}>{label}</button>)}</div><FinanceTable finance={finance} periods={periods} keys={financialGroups[group][1]} caption={financialGroups[group][0]} /></>;
}

function EarningsChart({ finance, periods }) {
  const [metric, setMetric] = useState('revenue');
  const row = finance.rows.find(r => r.key === metric);
  const values = periods.map(p => row?.values[p.key]);
  const max = Math.max(1, ...values.filter(finite).map(Math.abs));
  const negative = values.some(value => finite(value) && value < 0);
  const baseline = negative ? 100 : 142;
  const scale = negative ? 65 : 105;
  const column = 560 / Math.max(1, periods.length);
  return <div className="stock-analysis-chart">
    <div className="stock-analysis-chart-heading"><div className="stock-analysis-subfilters" role="group" aria-label="실적 차트 항목">{[['revenue','매출액'],['operating_profit','영업이익'],['net_income','순이익']].map(([key,label]) => <button type="button" key={key} aria-pressed={key === metric} onClick={() => setMetric(key)}>{label}</button>)}</div><span>억원</span></div>
    <div className="stock-analysis-chart-scroll"><svg viewBox="0 0 620 200" role="img" aria-label={`${row?.label || '실적'} 기간별 차트, 상세 값은 아래 표 참조`}>
      <line x1="30" y1={baseline} x2="590" y2={baseline} className="stock-analysis-baseline" />
      <text x="15" y={baseline + 4}>0</text>
      {periods.map((p, i) => {
        const value = values[i], height = finite(value) ? Math.abs(value) / max * scale : 0;
        const center = 30 + column * (i + .5);
        return <g key={p.key}>{finite(value) && <rect x={center - Math.min(25, column * .25)} y={value < 0 ? baseline : baseline - height} width={Math.min(50, column * .5)} height={height} className={`${value < 0 ? 'stock-analysis-bar-negative' : 'stock-analysis-bar'} ${p.estimate ? 'stock-analysis-bar-estimate' : ''}`}><title>{p.label}{p.estimate ? ' 추정' : ''}: {fmt(value)}억원</title></rect>}
          <text x={center} y={value < 0 ? baseline + height + 14 : baseline - height - 8} textAnchor="middle">{fmt(value)}</text><text x={center} y="191" textAnchor="middle">{p.label}{p.estimate ? ' (추정)' : ''}</text></g>;
      })}
    </svg></div>
  </div>;
}

function Investors({ rows }) {
  if (!rows?.length) return <Empty unavailable={rows == null} />;
  const groups = [['individual', '개인'], ['foreign', '외국인'], ['institution', '기관']];
  const total = key => rows.every(row => finite(row[key])) ? rows.reduce((sum, row) => sum + row[key], 0) : null;
  return <>
    <dl className="stock-analysis-totals">{groups.map(([key,label]) => <div key={key}><dt>{label} 누적</dt><dd className={tone(total(key))}>{fmt(total(key), true)}<small>주</small></dd></div>)}</dl>
    <InvestorBarChart rows={rows} groups={groups} />
    <div className="stock-analysis-table-scroll" tabIndex={0} role="region" aria-label="일별 투자자 순매수"><table className="stock-analysis-table"><thead><tr><th scope="col">일자</th>{groups.map(([key,label]) => <th scope="col" key={key}>{label}</th>)}<th scope="col">종가 (원)</th><th scope="col">외국인 보유율 (%)</th></tr></thead><tbody>{rows.map(row => <tr key={row.date}><th scope="row">{row.date.slice(2).replaceAll('-', '.')}</th>{groups.map(([key]) => <td key={key} className={tone(row[key])}>{fmt(row[key], true)}</td>)}<td>{fmt(row.close)}</td><td>{fmt(row.foreign_ratio)}</td></tr>)}</tbody></table></div>
  </>;
}

function InvestorBarChart({ rows, groups }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const svgRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(650);
  useEffect(() => {
    const svg = svgRef.current;
    const observer = new ResizeObserver(([entry]) => setChartWidth(Math.max(480, entry.contentRect.width)));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const selected = rows.find(row => row.date === selectedDate) || rows[0];
  const values = rows.flatMap(row => groups.map(([key]) => row[key])).filter(finite);
  const max = Math.max(1, ...values.map(Math.abs));
  const step = 10 ** Math.floor(Math.log10(max));
  const limit = Math.ceil(max / step) * step;
  const left = 66, right = chartWidth - 22, baseline = 146, halfHeight = 108;
  const slot = (right - left) / ordered.length;
  const barWidth = Math.min(22, slot / 5);
  const colors = ['#64748b', '#356ba8', '#168477'];
  return <div className="stock-investor-chart">
    <div className="stock-investor-chart-heading"><h3>일별 순매수</h3><div className="stock-investor-legend">{groups.map(([key, label], index) => <span key={key}><i style={{ backgroundColor: colors[index] }} aria-hidden="true" />{label}</span>)}</div></div>
    <div className="stock-investor-selection" aria-live="polite"><strong>{selected.date}</strong>{groups.map(([key, label]) => <span key={key}>{label} <b className={tone(selected[key])}>{fmt(selected[key], true)}주</b></span>)}</div>
    <div className="stock-investor-chart-scroll" role="region" aria-label="투자자별 일별 순매수 막대그래프" tabIndex={0}>
      <svg ref={svgRef} viewBox={`0 0 ${chartWidth} 300`} aria-label="개인 외국인 기관의 순매수 막대그래프. 0 위는 순매수, 아래는 순매도이며 날짜를 선택하면 수량이 표시됩니다.">
        <text x="12" y="18">만주</text>
        {[1, .5, 0, -.5, -1].map(tick => {
          const y = baseline - tick * halfHeight;
          return <g key={tick}><line x1={left} x2={right} y1={y} y2={y} className={tick === 0 ? 'stock-investor-zero' : 'stock-investor-grid'} /><text x={left - 10} y={y + 4} textAnchor="end">{fmt(limit * tick / 10000)}</text></g>;
        })}
        {ordered.map((row, index) => {
          const center = left + slot * (index + .5);
          return <g key={row.date} className="stock-investor-day" role="button" tabIndex={0} aria-pressed={row.date === selected.date} aria-label={`${row.date} ${groups.map(([key, label]) => `${label} ${fmt(row[key], true)}주`).join(', ')}`} onMouseEnter={() => setSelectedDate(row.date)} onFocus={() => setSelectedDate(row.date)} onClick={() => setSelectedDate(row.date)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDate(row.date); } }}>
            <rect x={center - slot / 2 + 3} y="28" width={slot - 6} height="238" className="stock-investor-hit" />
            {groups.map(([key, label], series) => {
              const value = row[key], height = finite(value) ? Math.abs(value) / limit * halfHeight : 0;
              const x = center + (series - 1) * (barWidth + 3) - barWidth / 2;
              if (!finite(value)) return <text key={key} x={x + barWidth / 2} y={baseline - 7} textAnchor="middle">—</text>;
              return <rect key={key} className="stock-investor-bar" x={x} y={value < 0 ? baseline : baseline - height} width={barWidth} height={value === 0 ? 1 : height} fill={colors[series]}><title>{row.date} {label}: {fmt(value, true)}주</title></rect>;
            })}
            <text x={center} y="285" textAnchor="middle">{row.date.slice(5).replace('-', '.')}</text>
          </g>;
        })}
      </svg>
    </div>
  </div>;
}

function Opinions({ data, code, active }) {
  if (!data) return <><Empty unavailable /><BrokerRatings code={code} active={active} /></>;
  return <>
    <dl className="stock-analysis-totals stock-analysis-consensus"><div><dt>목표주가 평균</dt><dd>{fmt(data.target_price)}<small>원</small></dd></div><div><dt>투자의견 평균</dt><dd>{consensusLabel(data.score)}<small className="block">{finite(data.score) ? `${data.score.toFixed(2)} / 5` : ''}</small></dd></div></dl>
    <BrokerRatings code={code} active={active} />
    <h3 className="stock-analysis-report-heading">증권사 리포트</h3>
    {data.reports.length ? <div className="stock-analysis-table-scroll" tabIndex={0} role="region" aria-label="증권사 리포트"><table className="stock-analysis-table stock-analysis-reports"><thead><tr><th scope="col">작성일</th><th scope="col">증권사</th><th scope="col">리포트</th></tr></thead><tbody>{data.reports.map(report => <tr key={report.id}><th scope="row">{report.date || '—'}</th><td>{report.broker}</td><td><a href={report.url} target="_blank" rel="noopener noreferrer">{report.title}<span className="sr-only"> (새 탭)</span></a></td></tr>)}</tbody></table></div> : <Empty />}
  </>;
}

function BrokerRatings({ code, active }) {
  const resource = useRemote(useCallback(async signal => {
    const { data } = await api.get(`/stocks/${encodeURIComponent(code)}/ratings`, { signal, ...(import.meta.env.DEV ? { baseURL: '/api' } : {}) });
    if (data?.symbol_code !== code || !Array.isArray(data.rows)) throw new Error('투자의견 자료를 확인할 수 없습니다.');
    return data;
  }, [code]), true, { cacheKey: JSON.stringify(['stock-ratings', code]), publicCache: true });
  useAutoRefresh(resource, 300_000, active);
  return <section aria-label="증권사별 투자의견" className="stock-analysis-broker-ratings">
    <div className="stock-analysis-toolbar"><h3 className="stock-analysis-report-heading">증권사별 투자의견</h3></div>
    <RemoteState resource={resource} requiresAuth={false} autoRefresh>
      {resource.data?.rows.length ? <div className="stock-analysis-table-scroll" role="region" aria-label="증권사별 매수 매도 의견" tabIndex={0}><table className="stock-analysis-table"><thead><tr>{['증권사', '최종일자', '투자의견', '직전 의견', '목표가 (원)', '직전 목표가 (원)'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{resource.data.rows.map((row, index) => <tr key={`${row.broker}:${row.date}:${index}`}><th scope="row">{row.broker}</th><td>{row.date}</td><td className={row.opinion?.includes('매수') ? 'stock-analysis-positive' : row.opinion?.includes('매도') ? 'stock-analysis-negative' : ''}>{brokerRatingLabel(row.opinion)}</td><td>{brokerRatingLabel(row.previous_opinion)}</td><td>{fmt(row.target_price)}</td><td>{fmt(row.previous_target_price)}</td></tr>)}</tbody></table></div> : <Empty />}
    </RemoteState>
    {resource.data && <div className="stock-analysis-source"><a href={`https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=${encodeURIComponent(code)}`} target="_blank" rel="noopener noreferrer">네이버 기업분석 · WiseReport</a>{resource.error && <span role="status"> · 이전 조회 자료</span>}</div>}
  </section>;
}
