import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  GLOSSARY,
  GLOSSARY_COUNT,
  groupByCategory,
  searchGlossary,
} from '../constants/glossary';
import { BookOpen } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';

/**
 * 용어사전 (F-9 확장) ★
 *
 * 왜 만들었나
 *  - 헤더 네비의 "학습" 메뉴가 갈 곳이 없었습니다. (learn API 가 없어 화면 자체가 없었음)
 *  - 용어집이 이미 로컬 데이터라 백엔드 없이 완성되는 유일한 학습 화면입니다.
 *  - 로그인·백엔드 둘 다 없어도 100% 동작하므로, 지금 시연에서 보여 줄 수 있는
 *    가장 완성도 높은 화면입니다.
 *
 * 개념 설명·퀴즈는 learn API 가 생긴 뒤에 붙입니다.
 */
export default function Learn() {
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
        <h1 className="text-xl font-extrabold text-gray-900">투자 용어사전</h1>
        <p className="mt-1 text-sm text-gray-500">
          어려운 말은 하나도 없어요. 총 {GLOSSARY_COUNT}개 용어를 쉬운 말로 풀어 두었습니다.
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
            placeholder="궁금한 용어를 검색해 보세요 (예: PER, 지정가, 평가손익)"
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
                  <span className="ml-2 text-xs font-medium text-gray-400">{ids.length}개</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {ids.map((id) => (
                    <TermCard key={id} id={id} onPickRelated={setKeyword} />
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

function TermCard({ id, onPickRelated }) {
  const t = GLOSSARY[id];
  return (
    <article className="flex h-full flex-col rounded-xl border border-gray-200 p-4 transition hover:border-brand-300">
      <h3 className="text-sm font-extrabold text-gray-900">{t.term}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{t.desc}</p>
      {t.example && (
        <p className="mt-3 rounded-lg bg-gray-50 p-2 text-xs leading-relaxed text-gray-500">
          예: {t.example}
        </p>
      )}
      {t.related?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {t.related.map((rid) => (
            <button
              key={rid}
              type="button"
              onClick={() => onPickRelated(GLOSSARY[rid]?.term ?? '')}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500 transition hover:border-brand-400 hover:text-brand-700"
            >
              {GLOSSARY[rid]?.term ?? rid}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
