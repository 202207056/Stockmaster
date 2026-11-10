import './NewsSummaryBody.css';
import { Cited, SourceLink } from './NewsSourceLink';

const sections = [
  ['recent_issues', '최근 확인되는 뉴스'],
  ['positive_factors', '긍정적으로 볼 수 있는 요인'],
  ['risk_factors', '주의해서 볼 수 있는 요인'],
];

// Compact text for banner fallbacks and topic matching; the body retains its categories.
export function newsParagraphs(brief) {
  const seen = new Set();
  return ['recent_issues', 'positive_factors', 'risk_factors'].flatMap(key => brief?.[key] || [])
    .filter(text => {
      const key = text.replace(/\s+/g, '').replace(/[.!。]+$/, '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const newsHeadline = brief => brief?.title || newsParagraphs(brief)[0] || '최근 뉴스 정리';

export const hasNewsCitations = brief => Object.values(brief?.citations || {}).some(sources => Array.isArray(sources) && sources.length > 0);

function NewsSentence({ text, brief }) {
  const exact = brief.citations?.[text];
  if (exact?.length) return <>{text}<SourceLink source={exact[0]} /></>;
  // Older snapshots only retain the summary's article list. Label that scope explicitly;
  // never guess which article supported an individual sentence.
  const legacy = !hasNewsCitations(brief) && !/\[\d+\]/.test(text);
  const sources = legacy ? (brief.evidence?.length ? brief.evidence : brief.sources || []) : [];
  return <><Cited text={text} sources={brief.sources || brief.evidence} />{sources.slice(0, 1).map((source, i) => <SourceLink key={i} source={source} summarySource />)}</>;
}

export default function NewsSummaryBody({ brief }) {
  const filled = sections.filter(([field]) => brief?.[field]?.length > 0);
  return <div className="shared-news-body">
    <div aria-label="뉴스 요약 본문" className="shared-news-copy">
      {filled.length ? filled.map(([field, title]) => <section className="shared-news-section" key={field} aria-label={title}>
        <h4>{title}</h4>
        <ul>{brief[field].map((text, index) => <li key={index}><NewsSentence text={text} brief={brief} /></li>)}</ul>
      </section>)
        : <p>최근 확인되는 관련 기사가 많지 않아요.</p>}
    </div>

  </div>;
}
