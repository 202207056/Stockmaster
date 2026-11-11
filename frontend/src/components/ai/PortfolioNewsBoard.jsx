import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fetchStockBrief } from '../../api/data';
import { readStockBrief, subscribeStockBrief } from '../../api/stockBriefCache';
import { newsColumns, newsTheme, relatedNewsPairs } from '../../utils/newsThemes';
import BannerTone from './BannerTone';
import NewsSummaryBody, { hasNewsCitations, newsHeadline, newsParagraphs } from '../common/NewsSummaryBody';
import { comma, rate, signTextClass } from '../../utils/format';
import './PortfolioNewsBoard.css';
import PortfolioNewsConnections from './PortfolioNewsConnections';

const hasNews = news => Boolean(news?.title || newsParagraphs(news).length);
// 카드에는 한 줄 요약(banner_summary)만 쓴다. 문장이나 기사 제목은 카드에 올리지 않는다.
const cardSummary = news => (typeof news?.banner_summary === 'string' && news.banner_summary.length <= 30 ? news.banner_summary : '');
// 상세 제목은 같은 소식을 더 자세히 쓴 banner_detail이 있으면 그것을, 없으면 한 줄 요약을 쓴다.
const cardDetail = news => (cardSummary(news) && news.banner_detail) || cardSummary(news);
const plainHeadline = text => (text || '').replace(/\s*\[\d+\]/g, '').trim();
function stockInfo(stock, news) {
  const price = Number.isFinite(news?.price) && news.price > 0 ? news.price : stock.price;
  return [Number.isFinite(price) && price > 0 ? `${comma(price)}원` : '현재가 정보 없음',
    Number.isFinite(stock.quantity) ? `${comma(stock.quantity)}주 보유` : null].filter(Boolean).join(' · ');
}

export default function PortfolioNewsBoard({ stocks, records = [], status = {}, selected, onSelect, onGenerate, renderGuesses, autoGenerateReady = false,
  renderOverview, title = 'AI 보유종목 브리핑', publicOnly = false, initialBriefs = {}, renderNewsFooter, autoFocus = false, enabled = true }) {
  const [briefs, setBriefs] = useState(initialBriefs);
  const [errors, setErrors] = useState({});
  const [retry, setRetry] = useState(0);
  const attempted = useRef(new Set());
  const root = useRef(null);
  const workspace = useRef(null);
  const track = useRef(null);
  const previous = useRef(new Map());
  const selectionOrigin = useRef(null);
  const returnFocus = useRef(null);
  const [pages, setPages] = useState({ before: false, after: false });
  const codes = stocks.map(stock => stock.code).join(',');
  useEffect(() => subscribeStockBrief(update => {
    const watched = codes.split(',');
    const updates = update ? [update] : watched.map(readStockBrief).filter(Boolean);
    for (const news of updates) if (watched.includes(news.symbol_code)) setBriefs(old => ({ ...old, [news.symbol_code]: news }));
  }), [codes]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    // One request at a time, with one public server snapshot shared by both screens.
    (async () => {
      for (const code of codes.split(',').filter(Boolean)) {
        if (controller.signal.aborted) return;
        if (initialBriefs[code] && !retry) continue;
        try {
          const data = await fetchStockBrief(code, controller.signal);
          if (!controller.signal.aborted) {
            setBriefs(old => ({ ...old, [code]: data }));
            setErrors(old => ({ ...old, [code]: false }));
          }
        } catch {
          if (!controller.signal.aborted) setErrors(old => ({ ...old, [code]: true }));
        }
      }
    })();
    return () => controller.abort();
  }, [codes, retry, enabled]);

  // A generated personal brief carries the exact public snapshot it was based on.
  const displayed = { ...Object.fromEntries(stocks.map(stock => [stock.code, readStockBrief(stock.code)])), ...briefs };
  for (const record of [...records].reverse()) {
    if (hasNewsCitations(displayed[record.symbol_code]) && !hasNewsCitations(record.news_brief)) continue;
    if (record.news_brief && (!displayed[record.symbol_code]
      || Date.parse(record.news_brief.generated_at) > Date.parse(displayed[record.symbol_code].generated_at))) {
      displayed[record.symbol_code] = record.news_brief;
    }
  }
  for (const record of [...records].reverse()) {
    if (displayed[record.symbol_code] && record.headline) displayed[record.symbol_code] = {
      ...displayed[record.symbol_code], banner_title: displayed[record.symbol_code].banner_title || displayed[record.symbol_code].title, title: record.headline,
      banner_summary: displayed[record.symbol_code].banner_summary || record.banner_summary,
    };
  }
  const chosen = stocks.find(stock => stock.code === selected);
  const brief = chosen && displayed[selected];
  const columns = newsColumns(stocks, displayed, chosen?.code);
  const adjacentCodes = columns.filter(column => column.priority).flatMap(column => column.stocks.map(stock => stock.code)).join(',');
  useLayoutEffect(() => {
    // Start beside the expanded article, even when it was opened on a later page.
    if (chosen && track.current) track.current.scrollLeft = 0;
  }, [selected, adjacentCodes]);
  const personal = chosen && records.find(item => item.symbol_code === selected);
  const detailHeadline = brief ? cardDetail(brief) || newsHeadline(brief) : null;
  useEffect(() => {
    if (!autoGenerateReady || !chosen || !brief || (personal?.trend_guesses?.length && personal?.watch_points?.length && personal?.banner_summary) || status[selected]?.loading || attempted.current.has(selected)) return;
    attempted.current.add(selected);
    onGenerate(selected);
  }, [autoGenerateReady, chosen, brief, personal, selected, status, onGenerate]);

  function measurePages() {
    const el = track.current;
    if (el) setPages({ before: el.scrollLeft > 8, after: el.scrollLeft + el.clientWidth < el.scrollWidth - 8 });
  }
  function select(code) {
    previous.current = new Map([...root.current.querySelectorAll('[data-news-card]')]
      .map(el => [el.dataset.newsCard, el.getBoundingClientRect()]));
    const detail = root.current.querySelector('.portfolio-news-detail');
    if (detail && selected) previous.current.set(selected, detail.getBoundingClientRect());
    returnFocus.current = code ? null : selected;
    selectionOrigin.current = previous.current.get(code);
    onSelect(code);
  }
  useLayoutEffect(() => {
    if (!previous.current.size) {
      if (autoFocus) root.current.querySelector('.portfolio-news-detail')?.focus({ preventScroll: true });
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      for (const el of root.current.querySelectorAll('[data-news-card]')) {
        const before = previous.current.get(el.dataset.newsCard);
        if (!before) continue;
        const after = el.getBoundingClientRect();
        el.animate?.([{ transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)` }, { transform: 'none' }],
          { duration: 460, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
      const detail = root.current.querySelector('.portfolio-news-detail');
      const before = selectionOrigin.current;
      if (detail && before) {
        const after = detail.getBoundingClientRect();
        detail.animate?.([
          { transformOrigin: 'top left', transform: `translate(${before.x - after.x}px, ${before.y - after.y}px) scale(${before.width / after.width}, ${before.height / after.height})` },
          { transformOrigin: 'top left', transform: 'none' },
        ], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
    previous.current.clear();
    selectionOrigin.current = null;
    root.current.querySelector('.portfolio-news-detail')?.focus({ preventScroll: true });
    if (!chosen && returnFocus.current) root.current.querySelector(`[data-news-card="${returnFocus.current}"] button`)?.focus({ preventScroll: true });
  }, [selected]);
  useEffect(() => {
    measurePages();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measurePages) : null;
    if (track.current) observer?.observe(track.current);
    window.addEventListener('resize', measurePages);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measurePages); };
  }, [columns.length, selected]);
  function move(direction) {
    track.current?.scrollBy({ left: direction * track.current.clientWidth,
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  return <div ref={root} className="portfolio-news-board" onKeyDown={event => {
    if (event.key === 'Escape' && chosen && !publicOnly) { event.stopPropagation(); select(null); }
  }}>
    {(title || renderOverview) && <div className="portfolio-news-toolbar">
      {title && <h2 className="text-base font-bold text-gray-800">{title}</h2>}
      {stocks.length > 0 && renderOverview?.(chosen?.code || stocks[0].code, displayed[chosen?.code || stocks[0].code])}
    </div>}
    <div ref={workspace} className={`portfolio-news-workspace${chosen ? ' is-expanded' : ''}`}>
      <PortfolioNewsConnections rootRef={workspace} pairs={relatedNewsPairs(stocks, displayed)} selected={chosen?.code} />
      {chosen && <article className="portfolio-news-detail trading-news-main" tabIndex={-1} aria-label={`${chosen.name} 브리핑`}>
        <header>
          <div className="portfolio-news-detail-tools"><span>{newsTheme(brief)}</span><button type="button" onClick={() => select(null)} aria-label="뉴스 요약 접기">접기 ↗</button></div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-xl font-extrabold text-gray-900">{chosen.name}</h3>
            {Number.isFinite(brief?.change_rate ?? chosen.change) && <span className={`font-bold ${signTextClass(brief?.change_rate ?? chosen.change)}`}>{rate(brief?.change_rate ?? chosen.change)}</span>}
            {!publicOnly && chosen.quantity > 0 && <span className="text-xs text-gray-500">{comma(chosen.quantity)}주 보유</span>}
          </div>
          {!publicOnly && !hasNews(brief) && <p className="portfolio-news-stock-info">{stockInfo(chosen, brief)}</p>}
          {detailHeadline && <div className="trading-news-summary"><p>{plainHeadline(detailHeadline)}{cardSummary(brief) && brief.banner_tone && <> <BannerTone tone={brief.banner_tone} rate={brief.change_rate} /></>}</p></div>}
        </header>
        {brief ? <div className="portfolio-news-detail-content trading-news-sections" key={`${selected}-${brief.generated_at}`}>
          <NewsSummaryBody brief={brief} />
          {!publicOnly && personal && renderGuesses?.(personal)}
          {renderNewsFooter?.(brief)}
          {status[selected]?.loading && <p role="status" className="text-xs text-gray-500">투자 흐름을 불러오고 있어요…</p>}
          {status[selected]?.error && <p role="alert">추정을 불러오지 못했어요. <button type="button" onClick={() => onGenerate(selected)}>다시 불러오기</button></p>}
        </div> : <p role="status" className="trading-news-pending">{errors[selected] ? '뉴스 요약을 불러오지 못했어요.' : '뉴스 요약을 불러오고 있어요…'}</p>}
        {errors[selected] && <button type="button" onClick={() => setRetry(value => value + 1)}>다시 불러오기</button>}
      </article>}
      <div className="portfolio-news-browser">
        <div className="portfolio-news-track" ref={track} onScroll={measurePages} aria-label={publicOnly ? '테마별 종목 뉴스' : '테마별 보유종목 뉴스'}>
          {columns.map(column => <section className="portfolio-news-column" key={column.key} aria-label={`${column.theme} 뉴스`}>
            <h3>{column.theme}{column.continued ? ' · 계속' : ''}</h3>
            {column.stocks.map(stock => {
              const news = displayed[stock.code];
              // 요약이 없으면 흐린 안내 문구를 보여 준다.
              const headline = cardSummary(news);
              const moveTitle = news && ('banner_title' in news ? news.banner_title : news.title);
              const note = !news ? (errors[stock.code] ? '뉴스를 불러오지 못했어요 · 눌러서 확인' : '뉴스 요약을 불러오고 있어요…')
                : !hasNews(news) ? '최근 확인되는 뉴스가 없어요' : moveTitle ? '회사 개별 소식 없음 · 시장 흐름' : '회사 개별 소식 없음';
              return <div className="portfolio-news-banner" data-news-card={stock.code} key={stock.code}>
                <button type="button" onClick={() => select(stock.code)} aria-label={`${stock.name} 뉴스 요약 열기`} aria-expanded={false}>
                  <div className="portfolio-news-banner-heading"><strong>{stock.name}</strong>{Number.isFinite(news?.change_rate ?? stock.change) && <b className={signTextClass(news?.change_rate ?? stock.change)}>{rate(news?.change_rate ?? stock.change)}</b>}{headline && <BannerTone tone={news?.banner_tone} rate={news?.change_rate ?? stock.change} />}</div><span title={headline ? plainHeadline(headline) : undefined} className={headline ? undefined : 'portfolio-news-banner-note'}>{headline ? plainHeadline(headline) : note}</span>
                  <i aria-hidden="true">›</i>
                </button>
              </div>;
            })}
          </section>)}
          {!columns.length && <p className="portfolio-news-empty">{publicOnly ? '다른 종목이 없어요.' : '다른 보유종목이 없어요.'}</p>}
        </div>
        {(pages.before || pages.after) && <div className="portfolio-news-pagination">
          <button type="button" disabled={!pages.before} onClick={() => move(-1)}>← 이전</button>
          <button type="button" disabled={!pages.after} onClick={() => move(1)}>더보기… →</button>
        </div>}
      </div>
    </div>
  </div>;
}
