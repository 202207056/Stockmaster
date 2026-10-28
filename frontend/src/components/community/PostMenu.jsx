import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { updatePost, deletePost } from '../../api/data';
import { InlineError } from '../common/ErrorState';

export default function PostMenu({ post, authenticated, onChanged, onDeleted, onShare }) {
  const { user } = useAuth();
  const owner = authenticated && user?.user_id != null && user.user_id === post.user_id;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const menu = useRef(null);
  const trigger = useRef(null);
  const dialog = useRef(null);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!menu.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const start = next => { setOpen(false); setError(null); setMode(next); dialog.current.showModal(); };
  const close = () => { if (busy) return; dialog.current.close(); setMode(null); setError(null); trigger.current?.focus(); };
  const submit = async event => {
    event.preventDefault();
    if (busy || !owner) return;
    const values = new FormData(event.currentTarget);
    const title = String(values.get('title') || '').trim();
    const content = String(values.get('content') || '').trim();
    if (mode === 'edit' && (!title || !content)) { setError(new Error('제목과 내용을 입력해 주세요.')); return; }
    setBusy(true); setError(null);
    try {
      if (mode === 'edit') await updatePost(post.post_id, { title, content });
      else await deletePost(post.post_id);
      dialog.current.close(); setMode(null);
      trigger.current?.focus();
      if (mode === 'delete') onDeleted();
      else onChanged();
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  };
  return <div ref={menu} className="relative shrink-0">
    <button ref={trigger} type="button" aria-label="게시글 더보기" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><MoreHorizontal size={20} /></button>
    {open && <div className="absolute right-0 top-full z-20 w-36 rounded-xl border border-gray-200 bg-white p-1 shadow-lg" onBlur={event => { if (!event.currentTarget.parentElement.contains(event.relatedTarget)) setOpen(false); }}>
      {owner && <><button type="button" onClick={() => start('edit')} className="block w-full rounded-lg px-4 py-2 text-left text-sm hover:bg-gray-50">수정</button><button type="button" onClick={() => start('delete')} className="block w-full rounded-lg px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">삭제</button></>}
      <button type="button" onClick={() => { setOpen(false); onShare(); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm hover:bg-gray-50">공유</button>
    </div>}
    <dialog ref={dialog} aria-label={mode === 'edit' ? '게시글 수정' : '게시글 삭제 확인'} onCancel={event => { event.preventDefault(); close(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(92vw,560px)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 backdrop:bg-black/40">
      {mode && <form key={mode} onSubmit={submit}>
        <h3 className="text-base font-bold text-gray-900">{mode === 'edit' ? '게시글 수정' : '게시글을 삭제할까요?'}</h3>
        <fieldset disabled={busy} className="mt-4 space-y-3">
          {mode === 'edit' ? <><label className="block text-sm text-gray-600">제목<input name="title" aria-label="수정할 글 제목" defaultValue={post.title} required maxLength={200} className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-gray-900" /></label><label className="block text-sm text-gray-600">내용<textarea name="content" aria-label="수정할 글 내용" defaultValue={post.content} required maxLength={10000} rows={8} className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-gray-900" /></label><p className="text-xs text-gray-500">제목과 내용을 수정할 수 있어요. 첨부한 사진·투표·거래내역은 유지됩니다.</p></> : <p className="text-sm leading-6 text-gray-600">삭제한 글과 댓글, 좋아요, 투표는 복구할 수 없어요.</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">취소</button><button type="submit" className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${mode === 'delete' ? 'bg-red-600' : 'bg-brand-600'}`}>{busy ? '처리 중…' : mode === 'edit' ? '수정 저장' : '삭제하기'}</button></div>
        </fieldset>
        <InlineError error={error} />
      </form>}
    </dialog>
  </div>;
}
