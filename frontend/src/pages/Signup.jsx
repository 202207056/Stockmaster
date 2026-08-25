import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';

/**
 * 회원가입 (F-2 라우팅 연결)
 *
 * 라우트가 등록되어 있지 않아 접근할 수 없던 화면입니다. 이제 /signup 으로 열리고,
 * Landing 의 "가입" 버튼도 여기로 옵니다.
 *
 * 폼과 실제 가입 처리는 POST /api/users/register 연동(F-11) 단계에서 붙입니다.
 * AuthProvider 에 signup() 이 이미 준비되어 있으므로 폼만 만들면 됩니다.
 */
export default function Signup() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center">
      <h1 className="text-2xl font-extrabold text-gray-900">회원가입</h1>
      <p className="mt-2 text-sm text-gray-500">
        가입하면 1,000만원짜리 모의투자 계좌가 자동으로 만들어져요.
      </p>

      {/* TODO(F-11): POST /api/users/register 연동 — useAuth().signup() 사용 */}
      <EmptyState
        icon="📝"
        title="가입 폼을 준비하고 있어요"
        description="아이디 · 비밀번호 · 이름 · 이메일 입력 폼이 곧 열립니다."
        className="rounded-xl border border-dashed border-gray-200"
      />

      <p className="mt-4 text-center text-sm text-gray-500">
        이미 계정이 있나요?{' '}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          로그인
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-gray-400">
        가입 전에{' '}
        <Link to="/dashboard" className="font-bold text-gray-600 hover:underline">
          둘러보기
        </Link>
        도 가능해요.
      </p>
    </div>
  );
}
