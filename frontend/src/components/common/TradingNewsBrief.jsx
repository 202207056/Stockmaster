import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { ThemeContent } from '../ai/ThemeBriefCard';
import { fetchPortfolio, fetchStockBrief, fetchThemeBrief } from '../../api/data';
import { safeExternalUrl } from '../../api/normalize';
import { readResource, resourceKey, writeResource } from '../../api/resourceCache';
import { useAuth } from '../../hooks/useAuth';
import { rate, signTextClass } from '../../utils/format';
import { kstStamp } from '../../utils/kstStamp';
import './TradingNewsBrief.css';

const sections = [
  ['recent_issues', '최근 확인되는 이슈'],
  ['positive_factors', '긍정적으로 볼 수 있는 요인'],
  ['risk_factors', '주의해서 볼 요인'],
];

// Show the browser copy at once, then replace it with the server result.
// The server shares one briefing per stock for three hours, so this rarely generates.
function useStockBrief(code, enabled) {
  const key = resourceKey('stock-brief', null, code);
  const [state, setState] = useState(() => ({ data: readResource(key)?.data ?? null, loading: enabled, error: false }));
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    fetchStockBrief(code, controller.signal).then(data => {
      writeResource(key, data, true);
      setState({ data, loading: false, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState(value => ({ ...value, loading: false, error: true }));
    });
    return () => controller.abort();
  }, [code, enabled, key]);
  return state;
}

function useHeldQuantities(accountId, enabled) {
  const [held, setHeld] = useState({});
  useEffect(() => {
    if (!enabled || !accountId) return undefined;
    const controller = new AbortController();
    fetchPortfolio(accountId, controller.signal).then(data => {
      setHeld(Object.fromEntries(data.holdings.map(item => [item.symbol_code, Number(item.hold_quantity) || 0])));
    }).catch(() => { /* Holding badges are optional. */ });
    return () => controller.abort();
  }, [accountId, enabled]);
  return held;
}

function useThemes(enabled) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    fetchThemeBrief(controller.signal).then(setData).catch(() => { /* The theme column hides itself. */ });
    return () => controller.abort();
  }, [enabled]);
  return data;
}

const question = changeRate => changeRate > 0 ? '왜 올랐을까?' : changeRate < 0 ? '왜 내렸을까?' : '최근 뉴스 정리';

export default function TradingNewsBrief({ code }) {
  const { accountId, isAuthenticated } = useAuth();
  const main = useStockBrief(code, isAuthenticated);
  const held = useHeldQuantities(accountId, isAuthenticated);
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(code);
  const themes = useThemes(open);
  const [picked, setPicked] = useState(false);
  if (!isAuthenticated || (!main.data && !main.loading) || (main.data && !main.data.ai_available)) return null;

  const brief = main.data;
  const stocks = brief ? [
    { code: brief.symbol_code, name: brief.name, change_rate: brief.change_rate, title: brief.title },
    ...brief.related,
  ] : [];
  const selectStock = (next) => {
    setPicked(true);
    setSelectedCode(next);
  };
  return <>
    <button type="button" className="trading-news-banner" disabled={!brief}
      onClick={() => { setPicked(false); setSelectedCode(code); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open}>
      <span className="min-w-0 flex-1">
        <span className="trading-news-banner__label"><span className="trading-news-banner__icon"><Sparkles size={14} aria-hidden="true" /></span>{brief ? question(brief.change_rate) : 'AI 뉴스'}</span>
        <span className="trading-news-banner__headline">{brief ? brief.title || '최근 확인되는 뉴스를 정리했어요' : 'AI가 뉴스를 정리하고 있어요…'}</span>
      </span>
      <ChevronRight size={18} className="shrink-0" aria-hidden="true" />
    </button>
    {brief && <Modal open={open} onClose={() => setOpen(false)} title="AI 뉴스" size="xl" draggable dimBackdrop={false}>
      <div className="trading-news-grid">
        <BriefDetail key={selectedCode} autoFocus={picked} code={selectedCode} initial={selectedCode === code ? brief : null} quantity={held[selectedCode]} />
        <section className="trading-news-related" aria-label="관련 종목">
          <h3 className="trading-news-eyebrow">함께 살펴볼 관련 종목</h3>
          {stocks.filter(stock => stock.code !== selectedCode).map(stock => <button type="button" key={stock.code} className="trading-news-related-card text-left" onClick={() => selectStock(stock.code)} aria-label={`${stock.name} 뉴스 상세 보기`}>
            <span className="flex flex-wrap items-baseline justify-between gap-1"><span className="flex flex-wrap items-baseline gap-1.5"><span className="font-bold text-gray-900">{stock.name}</span>{held[stock.code] > 0 && <span className="text-xs text-gray-500">보유</span>}</span><span className={`text-xs font-bold ${signTextClass(stock.change_rate)}`}>{rate(stock.change_rate)}</span></span>
            <span className={`mt-3 block text-xs leading-relaxed ${stock.title ? 'text-gray-600' : 'text-gray-400'}`}>{stock.title || '관련 기사 없음 · 등락률만 표시'}</span>
          </button>)}
        </section>
        {themes && <aside className="trading-news-themes" aria-label="관련 테마 AI 분석"><ThemeContent data={themes} showMetadata={false} /></aside>}
      </div>
    </Modal>}
  </>;
}

function BriefDetail({ autoFocus, code, initial, quantity }) {
  const ref = useRef(null);
  const fetched = useStockBrief(code, !initial);
  // The panel remounts per stock, so focus moves only after the new one exists.
  useEffect(() => {
    if (!autoFocus) return;
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [autoFocus]);
  const brief = initial || fetched.data;
  const filled = brief ? sections.filter(([field]) => brief[field].length > 0) : [];
  return <article ref={ref} tabIndex={-1} className="trading-news-main" aria-label={`${brief?.name || code} 뉴스 상세`} aria-busy={!brief && fetched.loading}>
    {!brief ? <p className="trading-news-pending">{fetched.loading ? 'AI가 뉴스를 정리하고 있어요…' : '브리핑을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'}</p> : <>
      <header>
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-xl font-extrabold text-gray-900">{brief.name}</h3>
          <span className={`font-bold ${signTextClass(brief.change_rate)}`}>{rate(brief.change_rate)}</span>
          {quantity > 0 && <span className="text-xs text-gray-500">{quantity}주 보유</span>}
        </div>
        {brief.title && <div className="trading-news-summary"><p>{brief.title}</p></div>}
      </header>
      <div className="trading-news-sections">
        {filled.length ? filled.map(([field, title]) => <section key={field}>
          <h4>{title}</h4>
          <ul>{brief[field].map(text => <li key={text}>{text}</li>)}</ul>
        </section>) : <p className="text-sm text-gray-500">최근 확인되는 관련 기사가 많지 않아요.</p>}
        {brief.evidence.length > 0 && <section className="trading-news-evidence">
          <h4>근거 기사</h4>
          <ul>{brief.evidence.slice(0, 3).map(article => {
            const url = safeExternalUrl(article.url);
            return <li key={article.title}>{url ? <a href={url} target="_blank" rel="noreferrer noopener">{article.title}</a> : article.title}
              {article.source && <span> · {article.source}</span>}</li>;
          })}</ul>
        </section>}
        <p className="trading-news-footnote">{brief.source} · {kstStamp(brief.generated_at)} 생성 · {brief.disclaimer}</p>
      </div>
    </>}
  </article>;
}
