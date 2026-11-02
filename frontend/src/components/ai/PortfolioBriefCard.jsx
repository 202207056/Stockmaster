import { useEffect, useRef, useState } from 'react';
import { fetchPortfolioBrief, fetchSavedPortfolioBriefs } from '../../api/data';
import { numberOrNull, quotePrice } from '../../api/normalize';
import { readResource, resourceKey, writeResource } from '../../api/resourceCache';
import { rate, signTextClass } from '../../utils/format';
import { kstStamp } from '../../utils/kstStamp';
import { LearningButton, LearningCard } from '../learn/LearningUI';
import './PortfolioBriefCard.css';

const sections = [
  ['current_status', '현재 상태'],
  ['entry_context', '포지션 시작 당시 가격 상황'],
  ['position_summary', '보유 흐름'],
  ['recent_issues', '최근 확인되는 이슈'],
  ['positive_factors', '긍정적으로 볼 수 있는 요인'],
  ['risk_factors', '주의해서 볼 요인'],
  ['watch_points', '앞으로 확인할 점'],
  ['limitations', '데이터 안내'],
];
// The latest and one previous briefing per account and stock.
const HISTORY_LIMIT = 2;
// One AI call per stock, generated in order; three keeps a run short.
const MAX_ON = 3;
const MOVING = 3;
const EMPTY = { history: [], loading: false, error: false, sync: 'idle' };
const stamp = item => Date.parse(item?.generated_at) || 0;
const historyKey = (accountId, code) => resourceKey('portfolio-brief', accountId, code);

function readHistory(key) {
  const items = readResource(key)?.data;
  // Browser copies are optional; anything unexpected is ignored instead of rendered.
  return Array.isArray(items) ? items.filter(item => stamp(item) > 0
    && typeof item.headline === 'string' && typeof item.disclaimer === 'string'
    && sections.every(([field]) => Array.isArray(item[field]))).slice(0, HISTORY_LIMIT) : [];
}

// Big moves today first, then the largest positions.
function rankHoldings(holdings) {
  const value = item => (quotePrice(item.quote) ?? numberOrNull(item.avg_price) ?? 0) * (numberOrNull(item.hold_quantity) ?? 0);
  const total = holdings.reduce((sum, item) => sum + value(item), 0);
  return holdings.map(item => {
    const change = numberOrNull(item.quote?.change_rate);
    return { code: item.symbol_code, name: item.security_name || item.symbol_code, change, value: value(item),
      weight: total > 0 ? value(item) / total * 100 : null, moving: change !== null && Math.abs(change) >= MOVING };
  }).sort((a, b) => (b.moving - a.moving) || (b.value - a.value));
}

export default function PortfolioBriefCard({ accountId, holdings = [], practice = false }) {
  return <LearningCard title="AI 보유종목 브리핑">
    {practice ? <p className="text-sm text-gray-500">연습모드에서는 AI 브리핑을 요청하지 않습니다.</p>
      : !accountId ? <p className="text-sm text-gray-500">계좌를 선택해 주세요.</p>
        : <AccountBrief key={accountId} accountId={accountId} holdings={holdings} />}
  </LearningCard>;
}

function AccountBrief({ accountId, holdings }) {
  const ranked = rankHoldings(holdings);
  const held = new Set(ranked.map(stock => stock.code));
  const prefsKey = resourceKey('portfolio-brief-ui', accountId, 'chips');
  const [prefs, setPrefs] = useState(() => {
    const saved = readResource(prefsKey)?.data;
    return { on: Array.isArray(saved?.on) ? saved.on : null, closed: Array.isArray(saved?.closed) ? saved.closed : [] };
  });
  // Until the viewer chooses, the top-ranked holding is on.
  const on = (prefs.on ?? ranked.slice(0, 1).map(stock => stock.code)).filter(code => held.has(code)).slice(0, MAX_ON);
  const closed = prefs.closed.filter(code => held.has(code) && !on.includes(code));
  const [briefs, setBriefs] = useState({});
  // One block is open at a time; the rest show their headline.
  const [open, setOpen] = useState(null);
  const [run, setRun] = useState('idle');
  const latestBriefs = useRef(briefs);
  const latestOn = useRef(on);
  const requested = useRef(new Set());
  const controllers = useRef(new Map());
  const alive = useRef(true);

  useEffect(() => { latestBriefs.current = briefs; }, [briefs]);
  useEffect(() => { latestOn.current = on; });
  useEffect(() => {
    alive.current = true;
    const running = controllers.current;
    return () => { alive.current = false; running.forEach(controller => controller.abort()); };
  }, []);
  useEffect(() => {
    if (prefs.on) writeResource(prefsKey, prefs, true);
  }, [prefs, prefsKey]);

  const heldKey = [...held].join(',');
  useEffect(() => {
    // A holding that disappears cancels its own generation.
    controllers.current.forEach((controller, code) => { if (!heldKey.split(',').includes(code)) controller.abort(); });
  }, [heldKey]);

  const patch = (code, change) => setBriefs(prev => ({ ...prev, [code]: { ...EMPTY, ...prev[code], ...change } }));

  const onKey = on.join(',');
  useEffect(() => {
    // Saved copies are DB reads only; they never generate.
    for (const code of onKey ? onKey.split(',') : []) {
      if (requested.current.has(code)) continue;
      requested.current.add(code);
      const local = readHistory(historyKey(accountId, code));
      setBriefs(prev => ({ ...prev, [code]: { ...EMPTY, ...prev[code], history: local, sync: 'checking' } }));
      fetchSavedPortfolioBriefs(accountId, code).then(items => {
        if (!alive.current) return;
        // The server copy wins when it is at least as new as this browser's copy.
        const useServer = items.length && stamp(items[0]) >= stamp(local[0]);
        if (useServer) writeResource(historyKey(accountId, code), items, true);
        setBriefs(prev => ({ ...prev, [code]: { ...EMPTY, ...prev[code],
          ...(useServer && !prev[code]?.loading ? { history: items } : {}),
          sync: prev[code]?.sync === 'checking' ? (items.length ? 'saved' : 'idle') : prev[code]?.sync } }));
      }).catch(() => {
        if (alive.current) setBriefs(prev => ({ ...prev, [code]: { ...EMPTY, ...prev[code],
          sync: prev[code]?.sync === 'checking' ? 'idle' : prev[code]?.sync } }));
      });
    }
  }, [accountId, onKey]);

  async function generate() {
    if (run === 'busy' || !on.length) return;
    setRun('busy');
    for (const code of on) {
      if (!alive.current) return;
      // A chip turned off while earlier stocks were generating is skipped.
      if (!latestOn.current.includes(code)) continue;
      const controller = new AbortController();
      controllers.current.set(code, controller);
      patch(code, { loading: true, error: false, sync: 'idle' });
      try {
        const data = await fetchPortfolioBrief(accountId, code, controller.signal, 'luna');
        if (controller.signal.aborted) continue;
        const brief = stamp(data) ? data : { ...data, generated_at: new Date().toISOString() };
        const history = [brief, ...(latestBriefs.current[code]?.history ?? [])].slice(0, HISTORY_LIMIT);
        writeResource(historyKey(accountId, code), history, true);
        patch(code, { history, loading: false, sync: 'saving' });
        setOpen(prev => prev ?? code);
        // Show the saved mark only after the server returns this exact briefing.
        const saved = await fetchSavedPortfolioBriefs(accountId, code, controller.signal).catch(() => []);
        if (!controller.signal.aborted) patch(code, { sync: saved[0]?.generated_at === brief.generated_at ? 'saved' : 'unsaved' });
      } catch {
        // Never display raw upstream details, URLs or provider errors.
        if (!controller.signal.aborted) patch(code, { loading: false, error: true });
      } finally {
        if (controllers.current.get(code) === controller) controllers.current.delete(code);
        if (controller.signal.aborted && alive.current) patch(code, { loading: false });
      }
    }
    if (alive.current) setRun('done');
  }

  function toggle(code) {
    if (on.includes(code)) {
      controllers.current.get(code)?.abort();
      setPrefs({ on: on.filter(item => item !== code), closed: [code, ...closed.filter(item => item !== code)] });
    } else if (on.length < MAX_ON) {
      setPrefs({ on: [...on, code], closed: closed.filter(item => item !== code) });
    }
  }
  const flip = code => setOpen(prev => prev === code ? null : code);

  if (!holdings.length) return <p className="text-sm text-gray-500">보유종목이 생기면 AI 브리핑을 확인할 수 있어요.</p>;
  const names = Object.fromEntries(ranked.map(stock => [stock.code, stock]));
  return <>
    <p className="text-sm leading-relaxed text-gray-500">현재 보유 상태와 포지션 시작 당시 가격 흐름, 최근 확인되는 종목 이슈를 객관적인 정보 중심으로 정리합니다.</p>
    <div role="group" aria-label="브리핑 대상 종목" className="portfolio-brief-chips">
      {ranked.map(stock => {
        const active = on.includes(stock.code);
        return <button type="button" key={stock.code} aria-pressed={active} disabled={!active && on.length >= MAX_ON}
          onClick={() => toggle(stock.code)} className="portfolio-brief-chip">
          <span className="portfolio-brief-chip__switch" aria-hidden="true">{active ? 'ON' : 'OFF'}</span>
          <span className="font-bold">{stock.name}</span>
          <span className="portfolio-brief-chip__meta">{stock.code}</span>
          {stock.change !== null && <span className={`portfolio-brief-chip__meta ${signTextClass(stock.change)}`}>{rate(stock.change)}</span>}
          {stock.weight !== null && <span className="portfolio-brief-chip__meta">비중 {Math.round(stock.weight)}%</span>}
        </button>;
      })}
    </div>
    <p className="mt-2 text-xs text-gray-500">오늘 크게 움직인 종목과 비중이 큰 종목이 앞에 있어요. 최대 {MAX_ON}개까지 켤 수 있어요.</p>
    <div className="mt-4">
      <LearningButton onClick={generate} disabled={run === 'busy' || !on.length}>
        {run === 'busy' ? '브리핑 생성 중...' : '브리핑 생성하기'}
      </LearningButton>
    </div>
    <p role="status" className="mt-2 text-sm text-gray-500">{run === 'busy' ? '브리핑을 생성하고 있어요.' : run === 'done' ? '브리핑 생성이 완료됐어요.' : ''}</p>
    <div className="space-y-3">
      {on.map(code => <BriefBlock key={code} stock={names[code]} state={briefs[code] ?? EMPTY}
        open={open === code} onFlip={() => flip(code)} onClose={() => toggle(code)} />)}
    </div>
    {closed.length > 0 && <div className="portfolio-brief-tray" aria-label="닫은 브리핑">
      <span>닫은 브리핑</span>
      {closed.map(code => <button type="button" key={code} disabled={on.length >= MAX_ON}
        onClick={() => toggle(code)} aria-label={`${names[code].name} 브리핑 다시 열기`}>↺ {names[code].name}</button>)}
    </div>}
  </>;
}

function BriefBlock({ stock, state, open, onFlip, onClose }) {
  const [latest, previous] = state.history;
  const status = state.loading ? '브리핑을 생성하고 있어요.'
    : state.sync === 'saving' ? '서버에 저장 확인 중…'
      : state.sync === 'checking' ? '저장된 브리핑 불러오는 중…' : '';
  return <section className="portfolio-brief-block" aria-label={`${stock.name} 브리핑`}>
    <header className="portfolio-brief-block__head">
      <div className="min-w-0">
        <p className="font-bold text-gray-900">{stock.name} <span className="text-xs font-normal text-gray-500">{stock.code}</span></p>
        <p className="portfolio-brief-stamp">
          {state.sync === 'saved' && latest && <span className="portfolio-brief-saved">✓ 서버에 저장됨</span>}
          {latest && !state.loading && <span>{kstStamp(latest.generated_at)} 생성</span>}
          {status && <span>{status}</span>}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {latest && <button type="button" className="portfolio-brief-block__btn" aria-expanded={open} onClick={onFlip}>{open ? '접기' : '펼치기'}</button>}
        <button type="button" className="portfolio-brief-block__btn" aria-label={`${stock.name} 브리핑 닫기`} onClick={onClose}>×</button>
      </div>
    </header>
    {state.error && <p role="alert" className="mt-2 text-sm text-gray-600">AI 브리핑을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
    {!latest && !state.loading && !state.error && state.sync !== 'checking' && <p className="mt-2 text-sm text-gray-500">아직 브리핑이 없어요. 브리핑 생성하기를 눌러 주세요.</p>}
    {latest && !open && <p className={`portfolio-brief-block__preview${state.loading ? ' opacity-50' : ''}`}>{latest.headline}</p>}
    {latest && open && <div className={state.loading ? 'opacity-50' : undefined}>
      <BriefResult key={latest.generated_at} data={latest} />
      {previous && <details className="portfolio-brief-previous">
        <summary>이전 브리핑 · {kstStamp(previous.generated_at)} 생성</summary>
        <BriefResult data={previous} still />
      </details>}
    </div>}
  </section>;
}

function BriefResult({ data, still = false }) {
  let line = 0;
  const nextLineStyle = () => ({ '--brief-line': line++ });

  return <div className={still ? 'portfolio-brief-still' : 'portfolio-brief-reveal'}>
    <div className="portfolio-brief-reveal__clip">
      <div className="mt-3 space-y-5 break-words [overflow-wrap:anywhere]">
        <h3 className="portfolio-brief-line text-base font-bold text-gray-900" style={nextLineStyle()}>{data.headline}</h3>
        {sections.map(([field, title]) => data[field].length > 0 && <section key={field} className={field === 'limitations' ? 'text-xs text-gray-500' : 'text-sm text-gray-700'}>
          <h4 className="portfolio-brief-line mb-2 font-bold" style={nextLineStyle()}>{title}</h4>
          <ul className="list-disc space-y-1 pl-5 leading-relaxed">{data[field].map((text, index) => <li key={index} className="portfolio-brief-line" style={nextLineStyle()}>{text}</li>)}</ul>
        </section>)}
        <p className="portfolio-brief-line border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500" style={nextLineStyle()}>{data.disclaimer}</p>
      </div>
    </div>
  </div>;
}
