import { useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import useRemote from '../../hooks/useRemote';
import { fetchNewsSummary } from '../../api/data';
import RemoteState from './RemoteState';

export default function StockNewsSummary({ code }) {
  const { isAuthenticated } = useAuth();
  const resource = useRemote(useCallback((signal) => fetchNewsSummary(code, signal), [code]), isAuthenticated && !!code, { cacheKey: JSON.stringify(['news-summary', code]), cachePreview: !!code });
  const data = resource.data;
  const summary = Array.isArray(data?.summary) ? data.summary.filter((line) => typeof line === 'string' && line.trim()).slice(0, 3) : [];
  const tags = Array.isArray(data?.tags) ? data.tags.filter((tag) => typeof tag === 'string' && tag.trim()).slice(0, 3) : [];

  return <section className="rounded-xl border border-gray-200 p-4 lg:col-span-4" aria-label="선택 종목 AI 뉴스 요약">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-bold text-gray-700">AI 뉴스 요약 <span className="font-normal text-gray-500">· {data?.name || code}</span></h2>
      {isAuthenticated && <button type="button" onClick={resource.reload} disabled={resource.loading} className="text-xs text-gray-500 underline disabled:opacity-50">요약 새로고침</button>}
    </div>
    <RemoteState resource={resource} authenticated={isAuthenticated}>
      {data && <div className="space-y-3">
        <h3 className="font-bold text-gray-900">{data.headline || '표시할 뉴스 요약이 없습니다.'}</h3>
        {summary.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">{summary.map((line, index) => <li key={index}>{line}</li>)}</ul>}
        {tags.length > 0 && <ul aria-label="뉴스 주제" className="flex flex-wrap gap-2">{tags.map((tag, index) => <li key={index} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">{tag}</li>)}</ul>}
      </div>}
    </RemoteState>
  </section>;
}
