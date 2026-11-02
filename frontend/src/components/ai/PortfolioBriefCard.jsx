import { useEffect, useId, useRef, useState } from 'react';
import { fetchPortfolioBrief, fetchSavedPortfolioBriefs } from '../../api/data';
import { readResource, resourceKey, writeResource } from '../../api/resourceCache';
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
const stamp = item => Date.parse(item?.generated_at) || 0;

function readHistory(key) {
  const items = readResource(key)?.data;
  // Browser copies are optional; anything unexpected is ignored instead of rendered.
  return Array.isArray(items) ? items.filter(item => stamp(item) > 0
    && typeof item.headline === 'string' && typeof item.disclaimer === 'string'
    && sections.every(([field]) => Array.isArray(item[field]))).slice(0, HISTORY_LIMIT) : [];
}

export default function PortfolioBriefCard({ accountId, holdings = [], practice = false }) {
  return <LearningCard title="AI 보유종목 브리핑">
    {practice ? <p className="text-sm text-gray-500">연습모드에서는 AI 브리핑을 요청하지 않습니다.</p>
      : !accountId ? <p className="text-sm text-gray-500">계좌를 선택해 주세요.</p>
        : <AccountBrief key={accountId} accountId={accountId} holdings={holdings} />}
  </LearningCard>;
}

function AccountBrief({ accountId, holdings }) {
  const [selection, setSelection] = useState(holdings[0]?.symbol_code ?? '');
  const selectId = useId();
  const selectedSymbol = holdings.some(item => item.symbol_code === selection)
    ? selection : holdings[0]?.symbol_code ?? '';
  // Reset a removed selection before committing this render. The keyed request
  // below unmounts immediately, so an old result never flashes for a new stock.
  if (selection !== selectedSymbol) setSelection(selectedSymbol);

  if (!holdings.length) return <p className="text-sm text-gray-500">보유종목이 생기면 AI 브리핑을 확인할 수 있어요.</p>;
  return <>
    <p className="text-sm leading-relaxed text-gray-500">현재 보유 상태와 포지션 시작 당시 가격 흐름, 최근 확인되는 종목 이슈를 객관적인 정보 중심으로 정리합니다.</p>
    <div className="mt-4 flex min-w-0 flex-col gap-2">
      <label htmlFor={selectId} className="text-sm font-medium text-gray-700">브리핑 대상 종목</label>
      <select id={selectId} value={selectedSymbol} onChange={event => setSelection(event.target.value)}
        className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:max-w-sm">
        {holdings.map(item => <option key={item.symbol_code} value={item.symbol_code}>{item.security_name || item.symbol_code} ({item.symbol_code})</option>)}
      </select>
    </div>
    <BriefRequest key={selectedSymbol} accountId={accountId} symbol={selectedSymbol} />
  </>;
}

function BriefRequest({ accountId, symbol }) {
  const controller = useRef(null);
  const storageKey = resourceKey('portfolio-brief', accountId, symbol);
  const [history, setHistory] = useState(() => readHistory(storageKey));
  // sync: checking saved copies · saving: confirming a new one · saved/unsaved: result of that check
  const [state, setState] = useState({ loading: false, error: false, sync: 'checking' });

  function keep(next) {
    writeResource(storageKey, next, true);
    setHistory(next);
  }

  useEffect(() => {
    const current = new AbortController();
    fetchSavedPortfolioBriefs(accountId, symbol, current.signal).then(items => {
      if (current.signal.aborted) return;
      // The server copy wins when it is at least as new as this browser's copy.
      if (items.length && stamp(items[0]) >= stamp(readHistory(storageKey)[0])) keep(items);
      setState(value => ({ ...value, sync: items.length ? 'saved' : 'idle' }));
    }).catch(() => {
      if (!current.signal.aborted) setState(value => ({ ...value, sync: 'idle' }));
    });
    return () => { current.abort(); controller.current?.abort(); };
    // keep() only writes this component's own storage key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, symbol, storageKey]);

  async function requestBrief() {
    if (controller.current && !controller.current.signal.aborted) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ loading: true, error: false, sync: 'idle' });
    try {
      const data = await fetchPortfolioBrief(accountId, symbol, current.signal, 'luna');
      if (current.signal.aborted) return;
      const brief = stamp(data) ? data : { ...data, generated_at: new Date().toISOString() };
      keep([brief, ...history].slice(0, HISTORY_LIMIT));
      setState({ loading: false, error: false, sync: 'saving' });
      // Show the saved mark only after the server returns this exact briefing.
      const saved = await fetchSavedPortfolioBriefs(accountId, symbol, current.signal).catch(() => []);
      if (!current.signal.aborted) {
        setState({ loading: false, error: false, sync: saved[0]?.generated_at === brief.generated_at ? 'saved' : 'unsaved' });
      }
    } catch {
      // Never display raw upstream details, URLs or provider errors.
      if (!current.signal.aborted) setState({ loading: false, error: true, sync: 'idle' });
    } finally {
      if (controller.current === current) controller.current = null;
    }
  }

  const [latest, previous] = history;
  const status = state.loading ? '브리핑을 생성하고 있어요.'
    : state.sync === 'saving' ? '서버에 저장 확인 중…'
      : state.sync === 'unsaved' ? '브리핑 생성이 완료됐어요.'
        : state.sync === 'checking' && latest ? '저장된 브리핑 불러오는 중…' : '';
  return <div className="mt-4 min-w-0">
    <LearningButton onClick={requestBrief} disabled={state.loading}>
      {state.loading ? '브리핑 생성 중...' : latest || state.error ? 'AI 브리핑 다시 보기' : 'AI 브리핑 보기'}
    </LearningButton>
    <p role="status" className="mt-2 text-sm text-gray-500">{status}</p>
    {state.error && <p role="alert" className="mt-3 text-sm text-gray-600">AI 브리핑을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
    {latest && <div className={state.loading ? 'opacity-50' : undefined}>
      <p className="portfolio-brief-stamp mt-4">
        {state.sync === 'saved' && <span className="portfolio-brief-saved">✓ 서버에 저장됨</span>}
        {kstStamp(latest.generated_at)} 생성
      </p>
      <BriefResult key={latest.generated_at} data={latest} />
    </div>}
    {previous && <details className="portfolio-brief-previous">
      <summary>이전 브리핑 · {kstStamp(previous.generated_at)} 생성</summary>
      <BriefResult data={previous} still />
    </details>}
  </div>;
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
