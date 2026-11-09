import { comma } from '../../utils/format';
import { useMemo, useState } from 'react';
import TermCard from './TermCard';
import { GLOSSARY_DESTINATIONS } from '../../constants/glossaryDestinations';
import {
  CATEGORIES,
  GLOSSARY,
  GLOSSARY_COUNT,
  groupByCategory,
  searchGlossary,
} from '../../constants/glossary';
import { BookOpen } from 'lucide-react';
import EmptyState from '../common/EmptyState';

/** Existing glossary preserved as contextual help within the learning hub. */
export default function GlossaryBrowser() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');

  const groups = useMemo(() => {
    const ids = searchGlossary(keyword);
    const byCat = groupByCategory(ids);
    if (category === 'all') return byCat;
    return { [category]: byCat[category] ?? [] };
  }, [keyword, category]);

  const hitCount = Object.values(groups).reduce((sum, ids) => sum + ids.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-extrabold text-gray-900">투자 용어사전</h2>
        <p className="mt-1 text-sm text-gray-500">
          {comma(GLOSSARY_COUNT)}개 용어
        </p>
      </div>

      {/* 검색 */}
      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">용어 검색</span>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="용어 검색 (예: PER, 지정가)"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none"
          />
        </label>

        {/* 카테고리 */}
        <div className="flex flex-wrap gap-2">
          <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
            전체
          </CategoryChip>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <CategoryChip key={key} active={category === key} onClick={() => setCategory(key)}>
              {label}
            </CategoryChip>
          ))}
        </div>
      </div>

      {hitCount === 0 ? (
        <EmptyState
          Icon={BookOpen}
          title="찾는 용어가 아직 없어요"
          description="다른 검색어로 찾아보시거나, 팀에 추가를 요청해 주세요."
        />
      ) : (
        <div className="flex flex-col gap-10">
          {Object.entries(groups).map(([cat, ids]) => {
            if (!ids.length) return null;
            return (
              <section key={cat}>
                <h2 className="mb-3 border-b border-gray-300 pb-2 text-base font-extrabold text-gray-800">
                  {CATEGORIES[cat]}
                  <span className="ml-2 text-xs font-medium text-gray-400">{comma(ids.length)}개</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {ids.map((id) => (
                    <TermCard key={id} term={GLOSSARY[id]} destination={GLOSSARY_DESTINATIONS[id]} onPickRelated={relatedId => setKeyword(GLOSSARY[relatedId].term)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-gray-200 text-gray-600 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  );
}
