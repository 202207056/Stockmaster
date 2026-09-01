import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import { EMPTY_MESSAGES } from '../constants/emptyMessages';
import HelpIcon from '../components/learn/HelpIcon';
import {
  FAVORITES_EVENT,
  getFavorites,
  removeFavorite,
  clearFavorites,
} from '../utils/favorites';

/**
 * 관심종목 (F-3 복붙 오류 수정 + §5-2 localStorage 임시 구현)
 *
 * 이 파일은 원래 "여기는 회원가입(Register) 화면입니다." 를 렌더링하고 있었습니다.
 * (Community.jsx 와 함께 템플릿을 복사하면서 문구를 안 바꾼 상태였습니다.)
 *
 * 백엔드에 favorites API 가 없으므로 목록은 localStorage 에 저장합니다.
 * 로그인과 무관하게 동작하므로 둘러보기 모드에서도 그대로 쓸 수 있습니다.
 * 종목명·현재가 표시는 GET /api/stocks 연동(F-12) 이후에 붙습니다.
 */
export default function Favorites() {
  const [codes, setCodes] = useState(getFavorites);

  useEffect(() => {
    const sync = () => setCodes(getFavorites());
    // 같은 탭(커스텀 이벤트) + 다른 탭(storage 이벤트) 양쪽을 반영합니다.
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="flex items-center text-xl font-extrabold text-gray-900">
            관심종목
            <HelpIcon termId="portfolio" label="포트폴리오 설명 보기" />
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            이 목록은 이 브라우저에만 저장돼요. 다른 기기에서는 보이지 않습니다.
          </p>
        </div>
        {codes.length > 0 && (
          <button
            type="button"
            onClick={() => clearFavorites()}
            className="text-sm font-medium text-gray-400 transition hover:text-up-600"
          >
            전체 삭제
          </button>
        )}
      </div>

      {codes.length === 0 ? (
        <EmptyState
          {...EMPTY_MESSAGES.favorites}
          action={
            <Link
              to="/trading"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              종목 둘러보기
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-gray-100 border-t border-gray-300">
          {codes.map((code) => (
            <li key={code} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="tabular rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
                  {code}
                </span>
                {/* TODO(F-12): /api/stocks/{code} 로 종목명·현재가 표시 */}
                <span className="text-sm text-gray-400">종목명 · 시세 연동 예정</span>
              </div>
              <button
                type="button"
                onClick={() => removeFavorite(code)}
                aria-label={`${code} 관심종목에서 빼기`}
                className="rounded p-1.5 text-gray-300 transition hover:text-up-600"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
