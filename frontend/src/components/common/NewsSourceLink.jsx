import { useState } from 'react';
import { safeExternalUrl } from '../../api/normalize';
import './NewsSummaryBody.css';
const CITE = /\s*\[(\d+)\]/g;
const plain = text => text.replace(CITE, '');
export function Cited({ text, sources = [] }) {
  const numbers = [...new Set([...text.matchAll(CITE)].map(match => Number(match[1])))];
  // Keep one source beside each sentence.
  const cited = numbers.map(number => sources[number - 1]).filter(Boolean).slice(0, 1);
  return <>{plain(text)}{cited.map((source, index) => <SourceLink key={index} source={source} />)}</>;
}

// Opens the article in a new tab; the small button next to it copies the link.
export function SourceLink({ source, summarySource = false }) {
  const [copied, setCopied] = useState(false);
  const label = source.source || '기사';
  const title = summarySource ? `이전 요약에 사용된 기사: ${source.title}` : source.title;
  const url = safeExternalUrl(source.url);
  if (!url) return <span className="portfolio-brief-cite" title={title}>{label}</span>;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* Clipboard may be blocked; the link itself still works. */ }
  }
  return <span className="portfolio-brief-cite-group">
    <a className="portfolio-brief-cite" href={url} target="_blank" rel="noopener noreferrer" title={title}>{label} ↗</a>
    <button type="button" className="portfolio-brief-cite-copy" onClick={copy} aria-label={`${label} 기사 링크 복사`}>{copied ? '복사됨' : '⧉'}</button>
  </span>;
}

