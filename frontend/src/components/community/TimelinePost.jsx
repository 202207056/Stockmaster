import { useRef, useState } from 'react';
import { Heart, MessageCircle, Repeat2, Send, ChevronRight } from 'lucide-react';
import { toggleLike } from '../../api/data';
import { InlineError } from '../common/ErrorState';
import PostAttachments from './PostAttachments';
import PostMenu from './PostMenu';

export { default as Avatar } from "../common/Avatar";
import Avatar from "../common/Avatar";

export default function TimelinePost({ post, authenticated, onOpen, onQuote, onChanged, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [likedOverride, setLikedOverride] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const shareDialog = useRef(null);
  const liked = likedOverride ?? post.liked ?? false;
  const link = new URL(`/community?post=${post.post_id}`, window.location.origin).href;
  const like = async () => {
    if (busy) return; setBusy(true); setError(null);
    try { const result = await toggleLike(post.post_id); setLikedOverride(result.liked); onChanged(); } catch (err) { setError(err); } finally { setBusy(false); }
  };
  const share = async () => {
    setShareMessage('');
    try {
      if (navigator.share) { await navigator.share({ title: post.title, url: link }); return; }
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(link); setShareMessage('게시글 링크를 복사했어요.'); return; }
      shareDialog.current.showModal();
    } catch (err) { if (err.name !== 'AbortError') shareDialog.current.showModal(); }
  };
  return <article className="community-post">
    <Avatar name={post.author_name} src={post.author_profile_image} />
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><span className="break-all font-semibold text-gray-800">{post.author_name}</span>{post.symbol_code && <><ChevronRight size={14} className="text-gray-300" aria-hidden="true" /><span className="font-semibold text-brand-600">{post.attachments?.symbol_name || post.symbol_code}</span></>}<time dateTime={post.created_at} className="ml-auto text-[11px] text-gray-400">{String(post.created_at || '').replace('T', ' ').slice(0, 16)}</time><PostMenu post={post} authenticated={authenticated} onChanged={onChanged} onDeleted={onDeleted} onShare={share} /></div>
      <button type="button" onClick={onOpen} className="mt-4 block w-full text-left"><h2 className="break-words text-lg font-bold leading-relaxed text-gray-900">{post.title}</h2></button>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">{post.content}</p>
      {post.detailUnavailable && <button type="button" onClick={onOpen} className="mt-2 text-xs text-brand-600">본문을 불러오지 못했어요. 게시글 열기</button>}
      <PostAttachments post={post} authenticated={authenticated} onChanged={onChanged} showSymbol={false} />
      <div className="community-actions" aria-label="게시글 반응">
        <button type="button" disabled={!authenticated || busy} onClick={like} aria-pressed={liked} aria-label={`좋아요 ${post.like_count || 0}, 누르면 전환`} title="좋아요"><Heart size={20} strokeWidth={1.7} aria-hidden="true" /><span>{post.like_count || 0}</span></button>
        <button type="button" onClick={onOpen} aria-label={`댓글 ${post.comment_count ?? post.comments?.length ?? 0}개 보기`} title="댓글"><MessageCircle size={20} strokeWidth={1.7} aria-hidden="true" /><span>{post.comment_count ?? post.comments?.length ?? 0}</span></button>
        <button type="button" disabled={!authenticated} onClick={onQuote} aria-label="리포스트 인용하기" title="리포스트 (인용)"><Repeat2 size={21} strokeWidth={1.7} aria-hidden="true" /></button>
        <button type="button" onClick={share} aria-label="게시글 공유" title="공유"><Send size={19} strokeWidth={1.7} aria-hidden="true" /></button>
      </div>
      <p role="status" className="text-xs text-brand-600">{shareMessage}</p>
      <dialog ref={shareDialog} aria-label="게시글 공유 링크" className="fixed inset-0 m-auto w-[min(90vw,420px)] rounded-2xl border border-gray-200 bg-white p-5 backdrop:bg-black/40"><h3 className="font-bold">게시글 공유</h3><p className="my-3 text-sm text-gray-500">아래 링크를 복사해 공유해 주세요.</p><input aria-label="공유 링크" readOnly value={link} onFocus={event => event.target.select()} className="w-full rounded-lg border border-gray-200 p-3 text-sm" /><button type="button" onClick={() => shareDialog.current.close()} className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">닫기</button></dialog>
      <InlineError error={error} />
    </div>
  </article>;
}
