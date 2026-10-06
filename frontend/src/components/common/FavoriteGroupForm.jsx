import { useState } from 'react';
import { createFavoriteGroup, renameFavoriteGroup } from '../../utils/favorites';

export default function FavoriteGroupForm({ group, onSaved }) {
  const [name, setName] = useState(group?.name || '');
  const [error, setError] = useState('');
  return <form onSubmit={event => {
    event.preventDefault();
    try {
      const saved = group ? (renameFavoriteGroup(group.id, name), { ...group, name: name.trim() }) : createFavoriteGroup(name);
      setName(''); setError(''); onSaved?.(saved);
    } catch (err) { setError(err.message || '그룹을 저장하지 못했습니다.'); }
  }}>
    <div className="flex gap-2">
      <input aria-label={group ? '그룹 이름 변경' : '새 그룹 이름'} value={name} onChange={event => setName(event.target.value)} maxLength={30} placeholder="새 그룹 이름" required className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <button type="submit" className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white">{group ? '이름 변경' : '그룹 추가'}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </form>;
}
