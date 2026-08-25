import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';

/**
 * 로그인 (F-2 레이아웃 편입)
 *
 * 폼과 실제 로그인 처리는 F-11 에서 붙입니다. AuthProvider 에 login() 이 준비되어
 * 있으므로 폼만 만들어 useAuth().login(loginId, passwd) 를 부르면 됩니다.
 * (로그인 응답에 유저 정보가 없어 /users/me 를 한 번 더 부르는 처리는
 *  AuthContext 안에 이미 들어 있습니다 — Doc/13 §3-1)
 *
 * 기존에 있던 `import api from '../api/axios'` 는 쓰이지 않아 제거했습니다.
 */
export default function Login() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center">
      <h1 className="text-2xl font-extrabold text-gray-900">로그인</h1>
      <p className="mt-2 text-sm text-gray-500">모의투자 계좌로 다시 들어가 보세요.</p>

      {/* TODO(F-11): POST /api/users/login 연동 — useAuth().login() 사용 */}
      <EmptyState
        icon="🔐"
        title="로그인 폼을 준비하고 있어요"
        description="아이디와 비밀번호 입력 폼이 곧 열립니다."
        className="rounded-xl border border-dashed border-gray-200"
      />

      <p className="mt-4 text-center text-sm text-gray-500">
        아직 계정이 없나요?{' '}
        <Link to="/signup" className="font-bold text-brand-600 hover:underline">
          회원가입
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-gray-400">
        로그인하지 않아도{' '}
        <Link to="/dashboard" className="font-bold text-gray-600 hover:underline">
          둘러보기
        </Link>
        는 가능해요.
      </p>
    </div>
  );
}
