import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { fetchNews } from '../api/data';
import { safeExternalUrl } from '../api/normalize';
import useRemote from '../hooks/useRemote';
import useNewsAnalysis from '../hooks/useNewsAnalysis';
import RemoteState from '../components/common/RemoteState';
import NewsThumbnail from '../components/common/NewsThumbnail';
import NewsAnalysisBadge from '../components/common/NewsAnalysisBadge';

export default function News() {
  const news = useRemote(useCallback(signal => fetchNews(signal), []), true, { cacheKey: 'news', publicCache: true });
  const analysis = useNewsAnalysis(news.data);
  return <section aria-labelledby="news-title" className="mx-auto w-full max-w-5xl">
    <Link to="/dashboard" className="mb-5 inline-flex items-center gap-1 text-sm text-gray-600"><ChevronLeft size={16} aria-hidden="true" />홈</Link>
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 id="news-title" className="text-xl font-extrabold">오늘의 뉴스</h1>
      <button type="button" onClick={news.reload} disabled={news.loading} aria-label="뉴스 새로고침" className="p-2 text-gray-600 disabled:opacity-50"><RefreshCw size={18} aria-hidden="true" /></button>
    </div>
    {news.error && news.data?.length > 0 && <p role="status" className="mb-4 text-sm text-gray-500">새로고침에 실패했습니다. 이전 조회 결과입니다.</p>}
    <RemoteState resource={news} requiresAuth={false} empty={!news.data?.length}>
      <ul aria-label="오늘의 뉴스 전체 목록" className="divide-y divide-gray-200">
        {news.data?.map((article, index) => <li key={`${article.url}-${index}`} className="flex gap-4 py-6 sm:gap-6">
          <NewsThumbnail url={article.image_url} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900">{safeExternalUrl(article.url) ? <a href={safeExternalUrl(article.url)} target="_blank" rel="noopener noreferrer" className="hover:underline">{article.title}</a> : article.title}<NewsAnalysisBadge analysis={analysis.data?.find(item => item.article_id === String(index))} /></h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{article.summary}</p>
            <p className="mt-3 text-xs text-gray-500">{[article.source, article.date].filter(Boolean).join(' · ')}</p>
          </div>
        </li>)}
      </ul>
    </RemoteState>
  </section>;
}
