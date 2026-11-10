import { useEffect, useRef, useState } from 'react';
import { fetchPortfolioBrief, fetchPortfolioBriefHistory } from '../../api/data';
import { numberOrNull, quotePrice } from '../../api/normalize';
import { readResource, resourceKey, writeResource } from '../../api/resourceCache';
import { LearningCard } from '../learn/LearningUI';
import BriefReport from './BriefReport';
import './PortfolioBriefCard.css';
import PortfolioNewsBoard from './PortfolioNewsBoard';
import { Cited } from '../common/NewsSourceLink';
import TradingNewsBrief from '../common/TradingNewsBrief';
import { rememberPortfolioHeadline } from '../../api/stockBriefCache';

const MOVING = 3;
// Same window as the server: today and the three days before it (KST dates).
const KEEP_DAYS = 3;
const KEEP_LIMIT = 100;
const stamp = item => Date.parse(item?.generated_at) || 0;
const kstDate = value => new Date(value + 9 * 3600e3).toISOString().slice(0, 10);
const daysAgo = item => Math.max(0, Math.round((Date.parse(kstDate(Date.now())) - Date.parse(kstDate(stamp(item)))) / 86400e3));
const kept = items => items.filter(item => daysAgo(item) <= KEEP_DAYS)
  .sort((a, b) => stamp(b) - stamp(a)).slice(0, KEEP_LIMIT);
const historyKey = accountId => resourceKey('portfolio-brief-history', accountId, 'all');
// "[2]" at the end of a news line points at sources[1]; plain views drop the numbers.
const CITE = /\s*\[(\d+)\]/g;
const plain = text => text.replace(CITE, '');
// The guess box title already says 추정; older briefings repeated it on every line.
const GUESS_LABEL = /^\s*추정\s*[:：]\s*/;

function readRecords(accountId) {
  const items = readResource(historyKey(accountId))?.data;
  // Browser copies are optional; anything unexpected is ignored instead of rendered.
  return Array.isArray(items) ? kept(items.filter(item => stamp(item) > 0 && typeof item.symbol_code === 'string'
    && typeof item.headline === 'string' && typeof item.disclaimer === 'string'
    && ['recent_issues', 'positive_factors', 'risk_factors'].every(key => Array.isArray(item[key])))) : [];
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
      price: quotePrice(item.quote), quantity: numberOrNull(item.hold_quantity),
      weight: total > 0 ? value(item) / total * 100 : null, moving: change !== null && Math.abs(change) >= MOVING };
  }).sort((a, b) => (b.moving - a.moving) || (b.value - a.value));
}

export default function PortfolioBriefCard({ accountId, holdings = [], practice = false }) {
  return <LearningCard title={practice || !accountId || !holdings.length ? 'AI 보유종목 브리핑' : undefined}>
    {practice ? <p className="text-sm text-gray-500">연습모드에서는 AI 브리핑을 요청하지 않습니다.</p>
      : !accountId ? <p className="text-sm text-gray-500">계좌를 선택해 주세요.</p>
        : <AccountBrief key={accountId} accountId={accountId} holdings={holdings} />}
  </LearningCard>;
}

function AccountBrief({ accountId, holdings }) {
  const ranked = rankHoldings(holdings);
  const [records, setRecords] = useState(() => readRecords(accountId));
  const [status, setStatus] = useState({});
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [openCode, setOpenCode] = useState(null);
  const controllers = useRef(new Map());
  const alive = useRef(true);
  const hasHoldings = holdings.length > 0;
  useEffect(() => {
    writeResource(historyKey(accountId), records, true);
    records.forEach(rememberPortfolioHeadline);
  }, [accountId, records]);
  useEffect(() => {
    alive.current = true;
    if (!hasHoldings) return undefined;
    const controller = new AbortController();
    const running = controllers.current;
    fetchPortfolioBriefHistory(accountId, controller.signal).then(items => {
      if (!controller.signal.aborted) setRecords(previous => merge(items, previous));
    }).catch(() => {}).finally(() => { if (!controller.signal.aborted) setHistoryLoaded(true); });
    return () => { alive.current = false; controller.abort(); running.forEach(item => item.abort()); };
  }, [accountId, hasHoldings]);
  const codes = ranked.map(stock => stock.code).join(',');
  useEffect(() => {
    controllers.current.forEach((controller, code) => { if (!codes.split(',').includes(code)) controller.abort(); });
  }, [codes]);

  async function generate(code) {
    if (controllers.current.has(code)) return;
    const controller = new AbortController();
    controllers.current.set(code, controller);
    setStatus(old => ({ ...old, [code]: { loading: true, error: false } }));
    try {
      const data = await fetchPortfolioBrief(accountId, code, controller.signal, 'luna');
      if (controller.signal.aborted) return;
      setRecords(previous => kept([data, ...previous]));
      const items = await fetchPortfolioBriefHistory(accountId, controller.signal).catch(() => null);
      if (items && !controller.signal.aborted) setRecords(previous => merge(items, previous));
    } catch {
      if (!controller.signal.aborted) setStatus(old => ({ ...old, [code]: { loading: false, error: true } }));
    } finally {
      controllers.current.delete(code);
      if (alive.current) setStatus(old => ({ ...old, [code]: { ...old[code], loading: false } }));
    }
  }
  if (!holdings.length) return <p className="text-sm text-gray-500">보유종목이 생기면 AI 브리핑을 확인할 수 있어요.</p>;
  return <>
    <PortfolioNewsBoard stocks={ranked} records={records} status={status} selected={openCode} autoGenerateReady={historyLoaded}
      renderOverview={(code, brief) => <TradingNewsBrief key={code} code={code} initialBrief={brief} triggerLabel="전체보기" />}
      onSelect={setOpenCode} onGenerate={generate} renderGuesses={data => <>
        <GuessResult data={data} />
        {data.id !== undefined && <div className="mt-3"><BriefReport kind="portfolio" code={data.symbol_code}
          generatedAt={data.generated_at} accountId={accountId} /></div>}
      </>} />
  </>;
}

function GuessResult({ data }) {
  const keywords = [...new Set((data.watch_points || []).map(text => plain(text)
    .replace(/(?:을|를)?\s*(?:확인|살펴볼|살펴봐야|점검)(?:할 수 있습니다|할 필요가 있습니다|해야 합니다|합니다|하세요|할 점|해야 할 점|이 필요합니다|할 필요가 있어요|해 주세요)[.!。]?\s*$/, '')
    .replace(/[.!。]+$/, '').trim()).filter(Boolean))];
  if (!data.trend_guesses?.length && !keywords.length) return null;
  return <><section className="portfolio-brief-guess text-sm" aria-label="투자 흐름">
    <h4 className="mb-2 font-bold">투자 흐름</h4>
    <ul className="list-disc space-y-2 pl-5 leading-relaxed">{(data.trend_guesses || []).map((text, index) => <li key={index}>
      <Cited text={text.replace(GUESS_LABEL, '')} sources={data.sources} />
    </li>)}</ul>
    <p className="portfolio-brief-guess-note">기사와 가격 흐름을 보고 추정한 내용이며, 확인된 사실이 아닙니다.</p>
  </section>
    {keywords.length > 0 && <div className="portfolio-brief-keywords" aria-label="앞으로 확인할 점">
      {keywords.map(text => <span key={text}>{text}</span>)}
    </div>}
  </>;
}

