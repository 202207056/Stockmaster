import EmptyState from '../components/common/EmptyState';

/**
 * 커뮤니티 (F-3 복붙 오류 수정)
 *
 * 이 파일도 "여기는 회원가입(Register) 화면입니다." 를 렌더링하고 있었습니다.
 * 화면 뼈대와 문구만 제자리로 돌려놓았고, 글 목록·상세·작성·댓글·좋아요는
 * /api/community/* 연동(F-17) 단계에서 채웁니다.
 */
export default function Community() {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">커뮤니티</h1>
        <p className="mt-1 text-sm text-gray-500">
          다른 투자자들과 종목 이야기를 나눠 보세요.
        </p>
      </div>

      {/* TODO(F-17): GET /api/community/posts 연동 */}
      <EmptyState
        icon="💬"
        title="커뮤니티는 준비 중이에요"
        description="글 목록과 댓글 기능을 연결하고 있어요. 조금만 기다려 주세요."
      />
    </div>
  );
}
