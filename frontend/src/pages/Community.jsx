import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useRemote from '../hooks/useRemote';
import { fetchPosts, fetchPost, createPost, createComment, toggleLike } from '../api/data';
import RemoteState from '../components/common/RemoteState';
import { InlineError } from '../components/common/ErrorState';
import { Heart, MessageSquare } from 'lucide-react';

export default function Community() {
  const { user, isAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams();
  const parsedPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const postId = Number(params.get('post')) || null;
  const resource = useRemote(useCallback((signal) => fetchPosts(page, signal), [page]), isAuthenticated);
  const [writing, setWriting] = useState(false);
  return <div className="flex flex-col gap-6">
    <div className="flex items-end justify-between border-b border-gray-200 pb-4">
      <div><h1 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">커뮤니티</h1><p className="mt-1 text-sm text-gray-500">다른 투자자들과 종목 이야기를 나눠 보세요.</p></div>
      <button type="button" disabled={!isAuthenticated} onClick={() => setWriting((value) => !value)} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">글쓰기</button>
    </div>
    {writing && isAuthenticated && <PostComposer key={user?.user_id} onSaved={(id) => { setWriting(false); resource.reload(); setParams({ post: id, page }); }} />}
    {postId && isAuthenticated && <PostDetail key={`${user?.user_id}:${postId}`} id={postId} onChanged={resource.reload} onClose={() => setParams({ page })} />}
    <RemoteState resource={resource} authenticated={isAuthenticated} empty={!resource.data?.items.length}>
      <ul className="divide-y divide-gray-100 border-t border-gray-300">{resource.data?.items.map((post) => <li key={post.post_id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><button className="block max-w-full truncate text-left text-sm font-bold text-gray-800" onClick={() => setParams({ page, post: post.post_id })}>{post.title}</button><p className="mt-1 flex items-center gap-2 text-xs text-gray-400"><span>{post.author_name}</span><span aria-hidden="true">·</span><span>{String(post.created_at || '').replace('T', ' ').slice(0, 16)}</span>{post.symbol_code && <span className="tabular rounded bg-gray-100 px-1.5 py-0.5 font-bold text-gray-500">{post.symbol_code}</span>}</p></div><div className="flex shrink-0 flex-col items-end gap-1 text-xs text-gray-400"><span className="flex items-center gap-1"><Heart size={13} strokeWidth={1.75} aria-hidden="true" />{post.like_count}</span><span className="flex items-center gap-1"><MessageSquare size={13} strokeWidth={1.75} aria-hidden="true" />{post.comment_count}</span></div></li>)}</ul>
    </RemoteState>
    {isAuthenticated && <div className="flex justify-center gap-4 text-sm"><button disabled={page <= 1 || resource.loading} onClick={() => setParams({ page: page - 1 })} className="disabled:text-gray-300">이전</button><span>{page} 페이지</span><button disabled={!resource.data || page * 20 >= resource.data.total || resource.loading} onClick={() => setParams({ page: page + 1 })} className="disabled:text-gray-300">다음</button></div>}
  </div>;
}

function PostComposer({ onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const send = async (event) => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const values = new FormData(form);
    const title = values.get('title').trim(); const content = values.get('content').trim();
    if (!title || !content) { setError(new Error('제목과 내용을 입력해 주세요.')); return; }
    setBusy(true); setError(null);
    try { const result = await createPost({ title, content, symbol_code: null }); form.reset(); onSaved(result.post_id); } catch (err) { setError(err); } finally { setBusy(false); }
  };
  return <div className="rounded-xl border border-gray-200 p-4"><form onSubmit={send} className="mt-4 flex flex-col gap-3"><input name="title" aria-label="글 제목" placeholder="제목" required maxLength={200} className="rounded border border-gray-300 p-3" /><textarea name="content" aria-label="글 내용" placeholder="내용" required maxLength={10000} rows={5} className="rounded border border-gray-300 p-3" /><InlineError error={error} /><button disabled={busy} className="rounded bg-brand-600 px-4 py-2 font-bold text-white disabled:bg-gray-300">{busy ? '등록 중…' : '게시글 등록'}</button></form></div>;
}

function PostDetail({ id, onChanged, onClose }) {
  const resource = useRemote(useCallback((signal) => fetchPost(id, signal), [id]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mutate = async (action) => {
    if (busy) return false; setBusy(true); setError(null);
    try { await action(); resource.reload(); onChanged(); return true; } catch (err) { setError(err); return false; } finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-brand-200 bg-brand-50/30 p-5"><button onClick={onClose} className="mb-3 text-sm text-gray-500 underline">상세 닫기</button><RemoteState resource={resource}>{resource.data && <>
    <h2 className="text-lg font-bold">{resource.data.title}</h2><p className="mt-1 text-xs text-gray-500">{resource.data.author_name}</p><p className="my-5 whitespace-pre-wrap break-words">{resource.data.content}</p>
    <button disabled={busy} onClick={() => mutate(() => toggleLike(id))} className="rounded border border-gray-300 px-3 py-2 text-sm">좋아요 {resource.data.like_count} · 누르면 전환</button>
    <ul className="mt-4 divide-y divide-gray-200">{resource.data.comments?.map((comment) => <li key={comment.comment_id} className="py-3 text-sm"><p className="font-bold">{comment.author_name}</p><p className="mt-1 whitespace-pre-wrap break-words">{comment.content}</p></li>)}</ul>
    <form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const content = new FormData(form).get('comment').trim(); if (!content) return; if (await mutate(() => createComment(id, content))) form.reset(); }} className="mt-3 flex gap-2"><input name="comment" aria-label="댓글 내용" placeholder="댓글을 입력하세요" required maxLength={2000} className="min-w-0 flex-1 rounded border border-gray-300 p-2" /><button disabled={busy} className="rounded bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-300">등록</button></form>
  </>}</RemoteState><InlineError error={error} /></section>;
}
