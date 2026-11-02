import { useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { ThemeContent } from '../ai/ThemeBriefCard';
import { tradingNewsMock, tradingNewsStocks, tradingThemeMock } from '../../constants/tradingNewsMock';
import { rate, signTextClass } from '../../utils/format';
import './TradingNewsBrief.css';

const sections = [
  ['recent_issues', '최근 확인되는 이슈'],
  ['positive_factors', '긍정적으로 볼 수 있는 요인'],
  ['risk_factors', '주의해서 볼 요인'],
];

export default function TradingNewsBrief() {
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(tradingNewsMock.code);
  const detailRef = useRef(null);
  const brief = tradingNewsStocks.find(stock => stock.code === selectedCode) || tradingNewsMock;
  const selectStock = (code) => {
    setSelectedCode(code);
    detailRef.current?.focus({ preventScroll: true });
    detailRef.current?.scrollIntoView?.({ block: 'nearest' });
  };
  return <>
    <button type="button" className="trading-news-banner" onClick={() => { setSelectedCode(tradingNewsMock.code); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open}>
      <span className="min-w-0 flex-1">
        <span className="trading-news-banner__label"><span className="trading-news-banner__icon"><Sparkles size={14} aria-hidden="true" /></span>왜 하락했을까?</span>
        <span className="trading-news-banner__headline">{tradingNewsMock.headline}</span>
      </span>
      <ChevronRight size={18} className="shrink-0" aria-hidden="true" />
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="AI 뉴스" size="xl" draggable dimBackdrop={false}>
      <div className="trading-news-grid">
        <article ref={detailRef} tabIndex={-1} className="trading-news-main" aria-label={`${brief.name} 뉴스 상세`}>
          <header>
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-xl font-extrabold text-gray-900">{brief.name}</h3>
              <span className={`font-bold ${signTextClass(brief.change_rate)}`}>{rate(brief.change_rate)}</span>
              {brief.quantity > 0 && <span className="text-xs text-gray-500">{brief.quantity}주 보유</span>}
            </div>
            <div className="trading-news-summary"><p>{brief.headline}</p></div>
          </header>
          <div className="trading-news-sections">{sections.map(([field, title]) => <section key={field}>
            <h4>{title}</h4>
            <ul>{brief[field].map(text => <li key={text}>{text}</li>)}</ul>
          </section>)}</div>
        </article>
        <section className="trading-news-related" aria-label="관련 종목">
          <h3 className="trading-news-eyebrow">함께 살펴볼 관련 종목</h3>
          {tradingNewsStocks.filter(stock => stock.code !== brief.code).map(stock => <button type="button" key={stock.code} className="trading-news-related-card text-left" onClick={() => selectStock(stock.code)} aria-label={`${stock.name} 뉴스 상세 보기`}>
            <span className="flex flex-wrap items-baseline justify-between gap-1"><span className="flex flex-wrap items-baseline gap-1.5"><span className="font-bold text-gray-900">{stock.name}</span>{stock.quantity > 0 && <span className="text-xs text-gray-500">보유</span>}</span><span className={`text-xs font-bold ${signTextClass(stock.change_rate)}`}>{rate(stock.change_rate)}</span></span>
            <span className="mt-3 block text-xs leading-relaxed text-gray-600">{stock.summary}</span>
          </button>)}
        </section>
        <aside className="trading-news-themes" aria-label="관련 테마 AI 분석"><ThemeContent data={tradingThemeMock} showMetadata={false} /></aside>
      </div>
    </Modal>
  </>;
}
