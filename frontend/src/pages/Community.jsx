import { Heart, MessageSquare } from 'lucide-react';
import MockBadge from '../components/common/MockBadge';
import { MOCK_POSTS } from '../constants/mockData';

/**
 * 커뮤니티
 *
 * 이 파일은 원래 "여기는 회원가입(Register) 화면입니다." 를 렌더링하고 있었습니다.
 * (Favorites.jsx 와 함께 템플릿을 복사하면서 문구를 안 바꾼 상태였습니다.)
 *
 * 🔴 아래 글 목록은 목업입니다. 연동 후 어떤 정보가 들어가는지 자리를 보여 주기 위한 것으로,
 *    제목 · 작성자 · 종목 태그 · 작성시각 · 좋아요/댓글 수가 그대로 매핑됩니다.
 *
 * TODO(F-17): GET /api/community/posts?page=1&size=20 연동
 *             글 상세 · 작성 · 댓글 · 좋아요도 같은 단계에서 붙입니다.
 */
export default function Community() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
            커뮤니티
            <MockBadge />
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            다른 투자자들과 종목 이야기를 나눠 보세요.
          </p>
        </div>
        {/* TODO(F-17): 글쓰기 → POST /api/community/posts */}
        <button
          type="button"
          disabled
          title="글쓰기는 연동 후 열립니다"
          className="cursor-not-allowed rounded-md bg-gray-200 px-4 py-2 text-sm font-bold text-gray-400"
        >
          글쓰기
        </button>
      </div>

      <ul className="divide-y divide-gray-100 border-t border-gray-300">
        {MOCK_POSTS.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-800">{p.title}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                <span>{p.author}</span>
                <span aria-hidden="true">·</span>
                <span>{p.time}</span>
                {p.symbol && (
                  <span className="tabular rounded bg-gray-100 px-1.5 py-0.5 font-bold text-gray-500">
                    {p.symbol}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Heart size={13} strokeWidth={1.75} aria-hidden="true" />
                {p.likes}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={13} strokeWidth={1.75} aria-hidden="true" />
                {p.comments}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* TODO(F-17): 페이지네이션 — 응답의 total / page 사용 */}
      <div className="flex justify-center py-4 text-sm text-gray-300">
        페이지 이동은 연동 후 열립니다
      </div>
    </div>
  );
}
