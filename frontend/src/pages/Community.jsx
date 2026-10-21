import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useRemote from '../hooks/useRemote';
import { fetchPosts, fetchPost, fetchStock, createComment } from '../api/data';
import RemoteState from '../components/common/RemoteState';
import { InlineError } from '../components/common/ErrorState';
import { PenLine, X } from 'lucide-react';
import PostComposer from '../components/community/PostComposer';
import TimelinePost, { Avatar } from '../components/community/TimelinePost';
import CommunityCategories from '../components/community/CommunityCategories';
import useCommunityCategories from '../hooks/useCommunityCategories';
import '../components/community/Community.css';

export default function Community() {
  const { user, isAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams();
  const parsedPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const postId = Number(params.get('post')) || null;
  const symbolCode = params.get('symbol') || '';
  const { categories, save } = useCommunityCategories(user?.user_id);
  const savedCategory = categories.find(item => item.symbol_code === symbolCode);
  const selectedStock = useRemote(useCallback(signal => fetchStock(symbolCode, signal), [symbolCode]), !!symbolCode && !savedCategory);
  const selectedCategory = savedCategory || (symbolCode ? { symbol_code: symbolCode, name: selectedStock.data?.name || '선택한 종목' } : null);
  const resource = useRemote(useCallback(signal => fetchPosts(page, signal, 20, symbolCode), [page, symbolCode]), isAuthenticated, { cacheKey: JSON.stringify(['posts-v2', page, 20, symbolCode]), cachePreview: true });
  const [composer, setComposer] = useState(null);
  const writer = useRef(null);
  const navigate = (next = {}) => setParams({ ...(symbolCode ? { symbol: symbolCode } : {}), page, ...next });
  const write = (quote = null) => { setComposer({ quote, symbol: selectedCategory }); writer.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const selectCategory = stock => setParams(stock ? { symbol: stock.symbol_code, page: 1 } : { page: 1 });
  const saved = (id, symbol) => { setComposer(null); resource.reload(); setParams({ ...(symbol ? { symbol: symbol.symbol_code } : {}), post: id, page: 1 }); };
  return <div className="community-layout">
    <CommunityCategories categories={categories} onSave={save} selected={symbolCode} onSelect={selectCategory} authenticated={isAuthenticated} />
    <div className="min-w-0 space-y-5">
      <section ref={writer} aria-label="내 글쓰기" className="community-card scroll-mt-6">
        <div className="flex items-center gap-4 p-5 sm:p-6"><Avatar name={user?.user_name || '나'} /><button type="button" disabled={!isAuthenticated} onClick={() => write()} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left disabled:opacity-40"><span><strong className="block text-sm text-gray-900">내 글쓰기</strong><span className="mt-1 block text-xs leading-5 text-gray-400">{isAuthenticated ? `${selectedCategory ? selectedCategory.name + '에 대한' : '오늘의'} 투자 이야기를 나눠 보세요.` : '로그인하고 투자 이야기를 나눠 보세요.'}</span></span><PenLine size={20} className="shrink-0 text-gray-400" /></button>{composer && <button type="button" aria-label="글쓰기 닫기" onClick={() => setComposer(null)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100"><X size={18} /></button>}</div>
        {composer && isAuthenticated && <PostComposer key={`${user?.user_id}:${composer.quote?.post_id || ''}:${composer.symbol?.symbol_code || ''}`} quote={composer.quote} initialSymbol={composer.symbol} onSaved={saved} />}
      </section>
      <header className="flex items-center justify-between gap-3 px-1"><h1 className="text-base font-bold text-gray-900">{selectedCategory ? `${selectedCategory.name} 이야기` : '커뮤니티'}</h1><span className="text-xs text-gray-400">최신순</span></header>
      <RemoteState resource={resource} authenticated={isAuthenticated}>
        {resource.data?.items.length === 0 && <div className="community-card px-5 py-12 text-center"><p className="text-sm text-gray-500">{selectedCategory ? '이 종목에 태그된 게시글이 아직 없어요.' : '아직 게시글이 없어요.'}</p><button type="button" onClick={() => write()} className="mt-4 text-sm font-bold text-brand-600">첫 이야기 작성하기</button></div>}
        <ul aria-label="커뮤니티 타임라인" className="space-y-5">{resource.data?.items.map(post => <li key={post.post_id} className="community-card">
          <TimelinePost post={post} authenticated={isAuthenticated} onOpen={() => navigate({ post: post.post_id })} onQuote={() => write(post)} onChanged={resource.reload} />
          {postId === post.post_id && isAuthenticated && <PostDetail key={`${user?.user_id}:${postId}`} id={postId} commentsOnly onChanged={resource.reload} onClose={() => navigate()} />}
        </li>)}</ul>
      </RemoteState>
      {postId && isAuthenticated && resource.data && !resource.data.items.some(post => post.post_id === postId) && <div className="community-card"><PostDetail key={postId} id={postId} onChanged={resource.reload} onClose={() => navigate()} onQuote={post => write(post)} /></div>}
      {isAuthenticated && !!resource.data?.total && <nav aria-label="타임라인 페이지" className="flex items-center justify-center gap-6 py-3 text-sm text-gray-500"><button disabled={page <= 1 || resource.loading} onClick={() => navigate({ page: page - 1 })} className="rounded-lg px-3 py-2 hover:bg-gray-100 disabled:text-gray-300">이전</button><span>{page} 페이지</span><button disabled={page * 20 >= resource.data.total || resource.loading} onClick={() => navigate({ page: page + 1 })} className="rounded-lg px-3 py-2 hover:bg-gray-100 disabled:text-gray-300">다음</button></nav>}
    </div>
  </div>;
}

function PostDetail({ id, onChanged, onClose, commentsOnly = false, onQuote }) {
  const resource = useRemote(useCallback(signal => fetchPost(id, signal), [id]), true, { cacheKey: JSON.stringify(['post-v2', id]) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const changed = () => { resource.reload(); onChanged(); };
  return <section aria-label="게시글 대화" className="border-t border-gray-100 bg-gray-50/60 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-gray-700">댓글</h2><button type="button" onClick={onClose} className="text-xs text-gray-400">닫기</button></div><RemoteState resource={resource}>{resource.data && <>
    {!commentsOnly && <TimelinePost post={resource.data} authenticated onOpen={() => document.getElementById(`comment-${id}`)?.focus()} onQuote={() => onQuote?.(resource.data)} onChanged={changed} />}
    <ul className="divide-y divide-gray-200">{resource.data.comments?.map(comment => <li key={comment.comment_id} className="py-3 text-sm"><p className="font-bold text-gray-800">{comment.author_name}</p><p className="mt-1 whitespace-pre-wrap break-words leading-6 text-gray-600">{comment.content}</p></li>)}</ul>
    {!resource.data.comments?.length && <p className="mb-3 text-xs text-gray-400">첫 댓글을 남겨 보세요.</p>}
    <form onSubmit={async event => { event.preventDefault(); if (busy) return; const form = event.currentTarget; const content = new FormData(form).get('comment').trim(); if (!content) return; setBusy(true); setError(null); try { await createComment(id, content); form.reset(); changed(); } catch (err) { setError(err); } finally { setBusy(false); } }} className="mt-3 flex gap-2"><input id={`comment-${id}`} name="comment" aria-label="댓글 내용" placeholder="댓글을 입력하세요" required maxLength={2000} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-3 text-sm" /><button disabled={busy} className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">등록</button></form>
  </>}</RemoteState><InlineError error={error} /></section>;
}
