import { useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import HelpIcon from '../components/learn/HelpIcon';
import StockQuote from '../components/common/StockQuote';
import GroupedFavoriteButton from '../components/common/GroupedFavoriteButton';
import FavoriteGroupForm from '../components/common/FavoriteGroupForm';
import useFavoriteLibrary from '../hooks/useFavoriteLibrary';
import { clearFavorites, clearRecentStocks, deleteFavoriteGroup } from '../utils/favorites';

export default function Favorites() {
  const { codes, groups, recent } = useFavoriteLibrary();
  const [view, setView] = useState('favorites');
  const [groupId, setGroupId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState('');
  const group = groups.find(item => item.id === groupId) || groups[0];
  const visible = view === 'recent' ? recent : view === 'groups' ? (group?.codes || []).filter(code => codes.includes(code)) : codes;
  const run = (action) => {
    try { action(); setError(''); }
    catch { setError('변경하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); }
  };
  return <div className="flex flex-col gap-6">
    <div className="border-b border-gray-200 pb-4">
      <h1 className="flex items-center text-xl font-extrabold text-gray-900">관심종목<HelpIcon termId="portfolio" label="포트폴리오 설명 보기" /></h1>
      <p className="mt-1 text-sm text-gray-500">이 목록은 이 브라우저에만 저장돼요. 다른 기기에서는 보이지 않습니다.</p>
    </div>
    <nav aria-label="관심종목 보기" className="flex flex-wrap items-center gap-2">
      {[['recent', '최근 조회'], ['favorites', '관심'], ['groups', '그룹']].map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => { setView(id); setRenaming(false); }} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>)}
      <button type="button" onClick={() => { setView('groups'); setAdding(value => !value); }} aria-expanded={adding && view === 'groups'} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">+ 그룹 추가</button>
    </nav>
    {view === 'groups' && <div className="space-y-4">
      {(adding || !groups.length) && <FavoriteGroupForm onSaved={created => { setGroupId(created.id); setAdding(false); setRenaming(false); }} />}
      {!!groups.length && <>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-0 items-center gap-2 text-sm">그룹 선택
            <select aria-label="그룹 선택" value={group.id} onChange={event => { setGroupId(event.target.value); setRenaming(false); }} className="min-w-0 max-w-64 rounded-lg border border-gray-300 bg-white px-3 py-2">
              {groups.map(item => <option key={item.id} value={item.id}>{item.name} ({item.codes.filter(code => codes.includes(code)).length})</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setRenaming(value => !value)} aria-expanded={renaming} className="px-2 py-1 text-sm text-gray-600 underline">이름 변경</button>
          <button type="button" onClick={() => run(() => { deleteFavoriteGroup(group.id); setRenaming(false); })} className="px-2 py-1 text-sm text-red-600">그룹 삭제</button>
        </div>
        {renaming && <FavoriteGroupForm key={group.id} group={group} onSaved={() => setRenaming(false)} />}
        <p className="text-xs text-gray-500">그룹을 삭제해도 종목은 ‘관심’에 남습니다. 별표를 눌러 그룹을 편집할 수 있어요.</p>
      </>}
    </div>}
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-gray-500">{view === 'recent' ? '최근 조회한 순서 · 최대 10개' : view === 'groups' ? group?.name || '그룹을 추가해 주세요' : `관심종목 ${codes.length}개`}</p>
      {visible.length > 0 && view !== 'groups' && <button type="button" onClick={() => run(view === 'recent' ? clearRecentStocks : clearFavorites)} className="shrink-0 text-gray-500 underline">{view === 'recent' ? '조회 기록 지우기' : '관심 전체 해제'}</button>}
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {!visible.length ? <EmptyState title={view === 'recent' ? '최근 조회한 종목이 없어요' : view === 'groups' ? '그룹에 담긴 종목이 없어요' : '관심종목이 아직 없어요'} description={view === 'recent' ? '종목 상세 화면을 열면 여기에 표시돼요.' : '종목의 별표를 눌러 관심종목과 그룹에 담아 보세요.'} action={<Link to="/trading" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white">종목 둘러보기</Link>} /> :
      <ul className="divide-y divide-gray-100 border-t border-gray-300">{visible.map(code => <li key={code} className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1"><StockQuote code={code} variant="favorites" /></div>
        <div className="shrink-0"><GroupedFavoriteButton code={code} /></div>
      </li>)}</ul>}
  </div>;
}
