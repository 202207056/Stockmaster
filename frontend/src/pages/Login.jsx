import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import TextField from '../components/common/TextField';
import Spinner from '../components/common/Spinner';
import { InlineError } from '../components/common/ErrorState';

/**
 * 로그인 (F-11 폼)
 *
 * 제출하면 useAuth().login() 이 POST /api/users/login → GET /api/users/me →
 * GET /api/trading/accounts 순서로 처리합니다.
 * (로그인 응답에 사용자 정보가 없어 /users/me 를 한 번 더 부르는 처리는
 *  AuthContext 안에 들어 있습니다 — Doc/13 §3-1)
 *
 * 환경설정의 API 서버를 호출하고 연결·인증 실패를 화면에 표시합니다.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ loginId: '', passwd: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = () => {
    const next = {};
    if (!form.loginId.trim()) next.loginId = '아이디를 입력해 주세요.';
    if (!form.passwd) next.passwd = '비밀번호를 입력해 주세요.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await login(form.loginId.trim(), form.passwd);
      // 보호 라우트에서 튕겨 온 경우 원래 가려던 곳으로 되돌립니다.
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center py-8">
      <h1 className="text-2xl font-extrabold text-gray-900">로그인</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <TextField
          label="아이디"
          value={form.loginId}
          onChange={update('loginId')}
          error={errors.loginId}
          autoComplete="username"
          placeholder="아이디를 입력하세요"
        />
        <TextField
          label="비밀번호"
          type="password"
          value={form.passwd}
          onChange={update('passwd')}
          error={errors.passwd}
          autoComplete="current-password"
          placeholder="비밀번호를 입력하세요"
        />

        <InlineError error={submitError} className="mt-1" />

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting && <Spinner />}
          {submitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        아직 계정이 없나요?{' '}
        <Link to="/signup" className="font-bold text-brand-600 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
