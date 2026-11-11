import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchPosts } from '../../api/data';
import useAuth from '../../hooks/useAuth';
import useRemote from '../../hooks/useRemote';
import RemoteState from '../common/RemoteState';

export default function StockCommunity({ code }) {
  const { isAuthenticated } = useAuth();
  const resource = useRemote(useCallback(signal => fetchPosts(1, signal, 10, code), [code]), !!code && isAuthenticated,
    { cacheKey: JSON.stringify(['posts-v2', 1, 10, code]), cachePreview: false });
  const destination = code ? `/community?symbol=${encodeURIComponent(code)}` : '/community';
  const posts = resource.data?.items.slice(0, 10) || [];
  return <section className="trading-community" aria-label="이 종목에 대한 의견">
    <header className="trading-community-heading">
      <h2>이 종목에 대한 의견</h2>
      <Link to={destination}>커뮤니티 &gt;</Link>
    </header>
    <div className="trading-community-scroll" tabIndex={0} aria-label="종목 의견 목록">
      {!code ? <p className="trading-community-empty">종목을 선택하면 의견을 볼 수 있어요.</p> : <RemoteState resource={resource} authenticated={isAuthenticated}>
        {resource.data && !posts.length && <p className="trading-community-empty">아직 이 종목에 대한 글이 없어요.<br /><Link to={destination}>첫 의견 남기기</Link></p>}
        <ul>{posts.map(post => <li key={post.post_id}>
          <Link className="trading-community-post" to={`${destination}&post=${post.post_id}`}>
            <strong>{post.title || post.attachments?.poll?.question || '종목 이야기'}</strong>
            {post.content && <p>{post.content}</p>}
            <span className="trading-community-meta"><span>{post.author_name || '작성자'}</span><span>좋아요 {post.like_count || 0} · 댓글 {post.comment_count || 0}</span></span>
            {(post.attachments?.trade || post.attachments?.poll) && <span className="trading-community-attachments">{[post.attachments.trade && '거래내역', post.attachments.poll && '투표'].filter(Boolean).join(' · ')}</span>}
          </Link>
        </li>)}</ul>
      </RemoteState>}
    </div>
  </section>;
}
