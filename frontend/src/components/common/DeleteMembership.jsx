import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { InlineError } from './ErrorState';

export default function DeleteMembership() {
  const [open, setOpen] = useState(false);
  return <section className="border-t border-gray-200 pt-6">
    <h2 className="text-sm font-bold text-gray-700">회원탈퇴</h2>
    <p className="mt-2 text-sm text-gray-500">탈퇴하면 계정과 모의투자 기록을 복구할 수 없어요.</p>
    <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm text-red-600 underline underline-offset-4">회원탈퇴하기</button>
    {open && <Confirmation onClose={() => setOpen(false)} />}
  </section>;
}

function Confirmation({ onClose }) {
  const { withdraw } = useAuth();
  const navigate = useNavigate();
  const dialog = useRef(null);
  const locked = useRef(false);
  const mounted = useRef(false);
  const [passwd, setPasswd] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    mounted.current = true;
    const element = dialog.current;
    const trigger = document.activeElement;
    element.showModal();
    return () => { mounted.current = false; element.close(); trigger?.focus?.(); };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (locked.current || !passwd || !agreed) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const deleted = await withdraw(passwd);
      if (deleted) navigate('/withdrawal-complete', { replace: true });
    } catch (err) {
      if (mounted.current) { setError(err); setPasswd(''); }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return <dialog ref={dialog} aria-labelledby="withdrawal-title" aria-describedby="withdrawal-description" onCancel={event => { event.preventDefault(); if (!locked.current) onClose(); }} className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl backdrop:bg-black/40">
    <h2 id="withdrawal-title" className="text-xl font-extrabold">정말 탈퇴하시겠어요?</h2>
    <p id="withdrawal-description" className="mt-3 text-sm leading-6 text-gray-600">개인정보, 모든 모의계좌와 거래·예약주문, 설문 결과, 작성한 게시글·댓글·좋아요 및 팔로우 정보가 삭제돼요. 내 게시글에 달린 댓글도 함께 삭제되며 복구할 수 없어요.</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm font-bold" htmlFor="withdrawal-password">현재 비밀번호</label>
      <input id="withdrawal-password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} value={passwd} onChange={event => setPasswd(event.target.value)} className="w-full rounded-lg border border-gray-300 p-3" />
      <label className="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" checked={agreed} disabled={busy} onChange={event => setAgreed(event.target.checked)} className="mt-1" />삭제되는 내용과 복구할 수 없음을 확인했어요.</label>
      <InlineError error={error} />
      {busy && <p role="status" className="text-sm text-gray-500">탈퇴 처리 중이에요…</p>}
      <div className="flex justify-end gap-3"><button type="button" autoFocus disabled={busy} onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50">취소</button><button type="submit" disabled={busy || !passwd || !agreed} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? '처리 중…' : '영구 탈퇴'}</button></div>
    </form>
  </dialog>;
}
