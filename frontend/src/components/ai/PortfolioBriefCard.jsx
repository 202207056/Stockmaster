import { useEffect, useRef, useState } from 'react';
import { deletePortfolioBrief, fetchPortfolioBrief, fetchPortfolioBriefHistory } from '../../api/data';
import { numberOrNull, quotePrice } from '../../api/normalize';
import { readResource, resourceKey, writeResource } from '../../api/resourceCache';
import { rate, signTextClass } from '../../utils/format';
import { kstStamp } from '../../utils/kstStamp';
import { LearningButton, LearningCard } from '../learn/LearningUI';
import BriefReport from './BriefReport';
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
// One AI call per stock, generated in order; four keeps a run under half a minute.
const MAX_ON = 4;
const MOVING = 3;
// Same window as the server: today and the three days before it (KST dates).
const KEEP_DAYS = 3;
const KEEP_LIMIT = 100;
const DAY_LABELS = ['오늘', '1일 전', '2일 전', '3일 전'];
// Holding an ON chip that already has a briefing switches it to RE; the main button then regenerates it.
// A quick tap stays a plain ON/OFF toggle: nothing shows until the press outlasts GRACE_MS.
const GRACE_MS = 350;
const HOLD_MS = 1000;
const IDLE = { loading: false, error: false, sync: 'idle' };
const stamp = item => Date.parse(item?.generated_at) || 0;
const recordKey = item => item.id ?? `${item.symbol_code}:${item.generated_at}`;
const kstDate = value => new Date(value + 9 * 3600e3).toISOString().slice(0, 10);
const daysAgo = item => Math.max(0, Math.round((Date.parse(kstDate(Date.now())) - Date.parse(kstDate(stamp(item)))) / 86400e3));
const kept = items => items.filter(item => daysAgo(item) <= KEEP_DAYS)
  .sort((a, b) => stamp(b) - stamp(a)).slice(0, KEEP_LIMIT);
const historyKey = accountId => resourceKey('portfolio-brief-history', accountId, 'all');
const kstTime = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function readRecords(accountId) {
  const items = readResource(historyKey(accountId))?.data;
  // Browser copies are optional; anything unexpected is ignored instead of rendered.
  return Array.isArray(items) ? kept(items.filter(item => stamp(item) > 0 && typeof item.symbol_code === 'string'
    && typeof item.headline === 'string' && typeof item.disclaimer === 'string'
    && sections.every(([field]) => Array.isArray(item[field])))) : [];
}

// The server list wins; briefings it never confirmed stay as unsaved browser copies.
function merge(server, local) {
  const known = new Set(server.map(item => `${item.symbol_code}:${item.generated_at}`));
  return kept([...server, ...local.filter(item => item.id === undefined && !known.has(`${item.symbol_code}:${item.generated_at}`))]);
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
  const [records, setRecords] = useState(() => readRecords(accountId));
  const [status, setStatus] = useState({});
  const [openCode, setOpenCode] = useState(null);
  const [again, setAgain] = useState([]);
  const [run, setRun] = useState('idle');
  const latestRecords = useRef(records);
  const latestOn = useRef(on);
  const controllers = useRef(new Map());
  const alive = useRef(true);

  useEffect(() => {
    latestRecords.current = records;
    writeResource(historyKey(accountId), records, true);
  }, [accountId, records]);
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

  // Saved briefings are DB reads only; they never generate.
  async function refresh(signal) {
    const server = await fetchPortfolioBriefHistory(accountId, signal);
    if (!alive.current || signal?.aborted) return server;
    const next = merge(server, latestRecords.current);
    latestRecords.current = next;
    setRecords(next);
    return server;
  }
  const refreshOnOpen = useRef(refresh);
  const hasHoldings = holdings.length > 0;
  useEffect(() => {
    if (!hasHoldings) return undefined;
    const controller = new AbortController();
    refreshOnOpen.current(controller.signal).catch(() => { /* Browser copies stay; the server list is optional. */ });
    return () => controller.abort();
  }, [accountId, hasHoldings]);

  const patch = (code, change) => setStatus(prev => ({ ...prev, [code]: { ...IDLE, ...prev[code], ...change } }));
  const latestOf = code => records.find(item => item.symbol_code === code);
  // The main button fills stocks without a briefing today, plus the ones switched to RE on purpose.
  const redo = again.filter(code => on.includes(code) && latestOf(code));
  const fresh = on.filter(code => !latestOf(code) || daysAgo(latestOf(code)) > 0);
  const pending = on.filter(code => fresh.includes(code) || redo.includes(code));

  async function generate(codes) {
    if (run === 'busy' || !codes.length) return;
    setRun('busy');
    for (const code of codes) {
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
        const next = kept([brief, ...latestRecords.current]);
        latestRecords.current = next;
        setRecords(next);
        patch(code, { loading: false, sync: 'saving' });
        setAgain(prev => prev.filter(item => item !== code));
        setOpenCode(prev => prev ?? code);
        await refresh(controller.signal).catch(() => []);
        if (!controller.signal.aborted) patch(code, { sync: 'idle' });
      } catch {
        // Never display raw upstream details, URLs or provider errors.
        if (!controller.signal.aborted) patch(code, { loading: false, error: true });
      } finally {
        if (controllers.current.get(code) === controller) controllers.current.delete(code);
        if (controller.signal.aborted && alive.current) patch(code, { loading: false, sync: 'idle' });
      }
    }
    if (alive.current) setRun('done');
  }

  async function remove(item) {
    if (item.id !== undefined) await deletePortfolioBrief(accountId, item.id);
    const next = latestRecords.current.filter(other => recordKey(other) !== recordKey(item));
    latestRecords.current = next;
    setRecords(next);
  }

  function toggle(code) {
    if (again.includes(code)) {
      setAgain(prev => prev.filter(item => item !== code));
    } else if (on.includes(code)) {
      controllers.current.get(code)?.abort();
      setPrefs({ on: on.filter(item => item !== code), closed: [code, ...closed.filter(item => item !== code)] });
    } else if (on.length < MAX_ON) {
      setPrefs({ on: [...on, code], closed: closed.filter(item => item !== code) });
    }
  }

  if (!holdings.length) return <p className="text-sm text-gray-500">보유종목이 생기면 AI 브리핑을 확인할 수 있어요.</p>;
  const names = Object.fromEntries(ranked.map(stock => [stock.code, stock]));
  return <>
    <p className="text-sm leading-relaxed text-gray-500">현재 보유 상태와 포지션 시작 당시 가격 흐름, 최근 확인되는 종목 이슈를 객관적인 정보 중심으로 정리합니다.</p>
    <div role="group" aria-label="브리핑 대상 종목" className="portfolio-brief-chips">
      {ranked.map(stock => {
        const active = on.includes(stock.code);
        const latest = latestOf(stock.code);
        return <StockChip key={stock.code} stock={stock} active={active} disabled={!active && on.length >= MAX_ON}
          redo={redo.includes(stock.code)} canHold={active && Boolean(latest) && !redo.includes(stock.code) && run !== 'busy'}
          onToggle={() => toggle(stock.code)} onHold={() => setAgain(prev => [...prev, stock.code])} />;
      })}
    </div>
    <p className="mt-2 text-xs text-gray-500">오늘 크게 움직인 종목과 비중이 큰 종목이 앞에 있어요. 최대 {MAX_ON}개까지 켤 수 있어요.
      브리핑이 있는 종목은 ON을 길게 누르면 RE로 바뀌고, 브리핑 생성하기를 누르면 다시 생성해요.</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <LearningButton onClick={() => generate(pending)} disabled={run === 'busy' || !pending.length}>
        {run === 'busy' ? '브리핑 생성 중...' : '브리핑 생성하기'}
      </LearningButton>
      {run !== 'busy' && on.length > 0 && !pending.length && <span className="text-xs text-gray-500">켠 종목은 오늘 브리핑이 있어요. 새로 만들려면 종목의 ON을 길게 눌러 RE로 바꿔 주세요.</span>}
      {run !== 'busy' && pending.length > 0 && (pending.length < on.length || redo.length > 0) && <span className="text-xs text-gray-500">
        {[fresh.length && `오늘 브리핑이 없는 ${fresh.length}종목`, redo.length && `RE ${redo.length}종목`].filter(Boolean).join('과 ')}{pending.length < on.length ? '만' : '을'} 생성해요.</span>}
    </div>
    <p role="status" className="mt-2 text-sm text-gray-500">{run === 'busy' ? '브리핑을 생성하고 있어요.' : run === 'done' ? '브리핑 생성이 완료됐어요.' : ''}</p>
    <div className="space-y-3">
      {on.map(code => <BriefBlock key={code} stock={names[code]} latest={latestOf(code)} state={status[code] ?? IDLE}
        accountId={accountId} open={openCode === code}
        onFlip={() => setOpenCode(prev => prev === code ? null : code)} onClose={() => toggle(code)} />)}
    </div>
    {closed.length > 0 && <div className="portfolio-brief-tray" aria-label="닫은 브리핑">
      <span>닫은 브리핑</span>
      {closed.map(code => <button type="button" key={code} disabled={on.length >= MAX_ON}
        onClick={() => toggle(code)} aria-label={`${names[code].name} 브리핑 다시 열기`}>↺ {names[code].name}</button>)}
    </div>}
    {records.length > 0 && <BriefHistory records={records} names={names} accountId={accountId} onRemove={remove} />}
  </>;
}

function StockChip({ stock, active, disabled, redo, canHold, onToggle, onHold }) {
  const [charging, setCharging] = useState(false);
  const timer = useRef(null);
  const fired = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  function start() {
    fired.current = false;
    if (!canHold || timer.current) return;
    timer.current = setTimeout(() => {
      // Once the charge shows, letting go early settles back to ON instead of switching off.
      fired.current = true;
      setCharging(true);
      timer.current = setTimeout(() => {
        timer.current = null;
        setCharging(false);
        onHold();
      }, HOLD_MS);
    }, GRACE_MS);
  }
  function stop() {
    clearTimeout(timer.current);
    timer.current = null;
    setCharging(false);
  }
  // Sliding off never ends in a click, so nothing is left to swallow.
  function cancel() {
    stop();
    fired.current = false;
  }
  function click() {
    // The click that ends a hold must not also turn the chip off.
    if (fired.current) fired.current = false;
    else onToggle();
  }
  return <button type="button" aria-pressed={active} disabled={disabled} onClick={click}
    onPointerDown={event => { if (event.button === 0) start(); }} onPointerUp={stop} onPointerLeave={cancel} onPointerCancel={cancel}
    onKeyDown={event => { if (event.key === ' ' && !event.repeat) start(); }} onKeyUp={event => { if (event.key === ' ') stop(); }}
    onContextMenu={event => { if (canHold) event.preventDefault(); }}
    aria-description={redo ? '다시 생성 대상이에요. 누르면 ON으로 돌아가요' : canHold ? '길게 누르면 다시 생성 대상(RE)으로 바뀌어요' : undefined}
    className={`portfolio-brief-chip${charging ? ' is-charging' : ''}${redo ? ' is-redo' : ''}`}
    style={{ '--hold-ms': `${HOLD_MS}ms` }}>
    <span className="portfolio-brief-chip__switch" aria-hidden="true">{redo || charging ? 'RE' : active ? 'ON' : 'OFF'}</span>
    <span className="font-bold">{stock.name}</span>
    <span className="portfolio-brief-chip__meta">{stock.code}</span>
    {stock.change !== null && <span className={`portfolio-brief-chip__meta ${signTextClass(stock.change)}`}>{rate(stock.change)}</span>}
    {stock.weight !== null && <span className="portfolio-brief-chip__meta">비중 {Math.round(stock.weight)}%</span>}
  </button>;
}

function BriefBlock({ stock, latest, state, accountId, open, onFlip, onClose }) {
  // A server id means the server listed this exact briefing.
  const saved = latest?.id !== undefined;
  const status = state.loading ? '브리핑을 생성하고 있어요.' : state.sync === 'saving' ? '서버에 저장 확인 중…' : '';
  return <section className="portfolio-brief-block" aria-label={`${stock.name} 브리핑`}>
    <header className="portfolio-brief-block__head">
      <div className="min-w-0">
        <p className="font-bold text-gray-900">{stock.name} <span className="text-xs font-normal text-gray-500">{stock.code}</span></p>
        <p className="portfolio-brief-stamp">
          {saved && !state.loading && <span className="portfolio-brief-saved">✓ 서버에 저장됨</span>}
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
    {!latest && !state.loading && !state.error && <p className="mt-2 text-sm text-gray-500">아직 브리핑이 없어요. 브리핑 생성하기를 눌러 주세요.</p>}
    {latest && !open && <p className={`portfolio-brief-block__preview${state.loading ? ' opacity-50' : ''}`}>{latest.headline}</p>}
    {latest && open && <div className={state.loading ? 'opacity-50' : undefined}>
      <BriefResult key={latest.generated_at} data={latest} />
      {saved && <div className="mt-3"><BriefReport kind="portfolio" code={latest.symbol_code} generatedAt={latest.generated_at} accountId={accountId} /></div>}
    </div>}
  </section>;
}

// Every saved briefing from today back to three days ago, two small boxes per row.
function BriefHistory({ records, names, accountId, onRemove }) {
  const [openKey, setOpenKey] = useState(null);
  const groups = DAY_LABELS.map((label, days) => [label, records.filter(item => daysAgo(item) === days)]).filter(([, items]) => items.length);
  return <section className="portfolio-brief-history" aria-label="이전 브리핑">
    <h3 className="text-sm font-bold text-gray-900">이전 브리핑</h3>
    <p className="mt-1 text-xs text-gray-500">오늘부터 3일 전까지 보관하고, 그보다 오래된 브리핑은 자동으로 지워져요.</p>
    {groups.map(([label, items]) => {
      const opened = items.find(item => recordKey(item) === openKey);
      return <div key={label} className="mt-3">
        <h4 className="portfolio-brief-history__day">{label}</h4>
        <ul className="portfolio-brief-history__grid">
          {items.map(item => <HistoryBox key={recordKey(item)} item={item} name={names[item.symbol_code]?.name || item.security_name || item.symbol_code}
            open={item === opened} onFlip={() => setOpenKey(prev => prev === recordKey(item) ? null : recordKey(item))} onRemove={onRemove} />)}
        </ul>
        {opened && <div className="portfolio-brief-history__open">
          <BriefResult data={opened} still />
          {opened.id !== undefined && <div className="mt-3"><BriefReport kind="portfolio" code={opened.symbol_code} generatedAt={opened.generated_at} accountId={accountId} /></div>}
        </div>}
      </div>;
    })}
  </section>;
}

function HistoryBox({ item, name, open, onFlip, onRemove }) {
  const [step, setStep] = useState('idle');
  async function confirm() {
    setStep('deleting');
    try {
      await onRemove(item);
    } catch {
      setStep('failed');
    }
  }
  return <li className={`portfolio-brief-history__box${open ? ' is-open' : ''}`} aria-label={`${name} ${kstTime.format(stamp(item))} 브리핑`}>
    <div className="flex items-start justify-between gap-2">
      <p className="min-w-0 text-xs"><span className="font-bold text-gray-900">{name}</span> <span className="text-gray-500">{kstTime.format(stamp(item))}</span></p>
      <div className="flex shrink-0 gap-1">
        <button type="button" className="portfolio-brief-block__btn" aria-expanded={open} onClick={onFlip}
          aria-label={`${name} 브리핑 ${open ? '접기' : '펼치기'}`}>{open ? '▣' : '□'}</button>
        <button type="button" className="portfolio-brief-block__btn" onClick={() => setStep('confirm')} aria-label={`${name} 브리핑 삭제`}>×</button>
      </div>
    </div>
    <p className="portfolio-brief-history__headline">{item.headline}</p>
    {item.id === undefined && <p className="mt-1 text-[11px] text-gray-400">이 브라우저에만 저장됨</p>}
    {step !== 'idle' && <div className="portfolio-brief-history__confirm" role="group" aria-label="삭제 확인">
      <span>{step === 'failed' ? '삭제하지 못했어요.' : '삭제할까요?'}</span>
      <button type="button" onClick={confirm} disabled={step === 'deleting'}>삭제</button>
      <button type="button" onClick={() => setStep('idle')}>취소</button>
    </div>}
  </li>;
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
