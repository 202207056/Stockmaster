import { useCallback } from 'react';
import useAuth from './useAuth';
import useRemote from './useRemote';
import { analyzeNews } from '../api/data';

export default function useNewsAnalysis(news) {
  const { isAuthenticated } = useAuth();
  // Relative publication dates in the news feed are not ISO datetimes.
  const payload = JSON.stringify((news || []).slice(0, 10).map((article, index) => ({
    article_id: String(index), title: article.title,
    content: article.summary || undefined, url: article.url || undefined,
    source: article.source || undefined,
  })));
  return useRemote(useCallback(signal => analyzeNews(JSON.parse(payload), signal), [payload]),
    isAuthenticated && payload !== '[]');
}
