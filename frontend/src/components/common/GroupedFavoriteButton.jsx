import { useEffect, useId, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useFavoriteLibrary from '../../hooks/useFavoriteLibrary';
import { removeFavorite, saveFavoriteGroups } from '../../utils/favorites';
import FavoriteButton from './FavoriteButton';
import FavoriteGroupForm from './FavoriteGroupForm';

export default function GroupedFavoriteButton({ code }) {
  const { user } = useAuth();
  return <FavoriteControl key={`${user?.user_id ?? 'guest'}:${code}`} code={code} />;
}

function FavoriteControl({ code }) {
  const library = useFavoriteLibrary();
  const [open, setOpen] = useState(false);
  const selected = library.codes.includes(code);
  return <>
    <FavoriteButton selected={selected} label={selected ? '관심종목 그룹 편집' : '관심종목 추가'} onClick={() => setOpen(true)} />
    {open && <GroupDialog code={code} selected={selected} groups={library.groups} onClose={() => setOpen(false)} />}
  </>;
}

function GroupDialog({ code, selected, groups, onClose }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [ids, setIds] = useState(() => groups.filter(group => group.codes.includes(code)).map(group => group.id));
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  const save = (remove = false) => {
    try { if (remove) removeFavorite(code); else saveFavoriteGroups(code, ids); onClose(); }
    catch { setError('저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); }
  };
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl backdrop:bg-slate-900/50">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 id={titleId} className="text-lg font-bold">관심종목 그룹 선택</h2><button type="button" aria-label="그룹 선택 닫기" onClick={onClose} className="rounded px-2 py-1">✕</button></div>
    <p className="mb-4 text-sm text-gray-500">여러 그룹을 선택할 수 있어요. 선택하지 않으면 ‘관심’에만 저장됩니다.</p>
    <div className="mb-4 space-y-2">{groups.map(group => <label key={group.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm">
      <input type="checkbox" checked={ids.includes(group.id)} onChange={event => setIds(previous => event.target.checked ? [...previous, group.id] : previous.filter(id => id !== group.id))} />
      <span className="break-all">{group.name}</span>
    </label>)}</div>
    <FavoriteGroupForm onSaved={group => setIds(previous => [...previous, group.id])} />
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      {selected && <button type="button" onClick={() => save(true)} className="mr-auto rounded-lg px-3 py-2 text-sm text-red-600">관심 해제</button>}
      <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">취소</button>
      <button type="button" onClick={() => save()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">저장</button>
    </div>
  </dialog>;
}
