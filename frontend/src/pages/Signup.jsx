import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import TextField from '../components/common/TextField';
import Spinner from '../components/common/Spinner';
import { InlineError } from '../components/common/ErrorState';

/**
 * 회원가입 (F-11 폼)
 *
 * 제출 흐름
 *   POST /api/users/register  →  자동 로그인  →  /survey (투자성향 설문)
 *
 * 설문으로 바로 보내는 이유: 설문은 가입 직후 한 번 받는 것이 자연스럽고,
 * 그 결과가 있어야 대시보드를 개인화할 수 있기 때문입니다.
 * 설문 화면에는 상단 메뉴가 없고 "나중에 할게요"로 건너뛸 수 있습니다.
 *
 * ⚠️ 백엔드가 아직 연결되지 않아 지금 제출하면 "서버에 연결할 수 없습니다."가 뜹니다.
 *    이는 정상 동작입니다.
 */
export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    loginId: '',
    passwd: '',
    passwdConfirm: '',
    userName: '',
    email: '',
  });
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
    const id = form.loginId.trim();

    if (!id) next.loginId = '아이디를 입력해 주세요.';
    else if (!/^[A-Za-z0-9_]{4,20}$/.test(id))
      next.loginId = '영문·숫자·밑줄 4~20자로 입력해 주세요.';

    if (!form.passwd) next.passwd = '비밀번호를 입력해 주세요.';
    else if (form.passwd.length < 4) next.passwd = '비밀번호는 4자 이상이어야 해요.';

    if (form.passwdConfirm !== form.passwd) next.passwdConfirm = '비밀번호가 일치하지 않아요.';

    if (!form.userName.trim()) next.userName = '이름을 입력해 주세요.';

    const email = form.email.trim();
    if (!email) next.email = '이메일을 입력해 주세요.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = '이메일 형식이 올바르지 않아요.';

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
      await signup({
        loginId: form.loginId.trim(),
        passwd: form.passwd,
        userName: form.userName.trim(),
        email: form.email.trim(),
      });
      // 가입 직후 투자성향 설문으로 이어집니다.
      navigate('/survey', { replace: true });
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-8">
      <h1 className="text-2xl font-extrabold text-gray-900">회원가입</h1>
      <p className="mt-2 text-sm text-gray-500">
        가입하면 1,000만원짜리 모의투자 계좌가 자동으로 만들어져요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <TextField
          label="아이디"
          value={form.loginId}
          onChange={update('loginId')}
          error={errors.loginId}
          hint="영문·숫자·밑줄 4~20자"
          autoComplete="username"
          placeholder="사용할 아이디"
        />
        <TextField
          label="비밀번호"
          type="password"
          value={form.passwd}
          onChange={update('passwd')}
          error={errors.passwd}
          autoComplete="new-password"
          placeholder="4자 이상"
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          value={form.passwdConfirm}
          onChange={update('passwdConfirm')}
          error={errors.passwdConfirm}
          autoComplete="new-password"
          placeholder="비밀번호를 한 번 더"
        />
        <TextField
          label="이름"
          value={form.userName}
          onChange={update('userName')}
          error={errors.userName}
          autoComplete="name"
          placeholder="화면에 표시될 이름"
        />
        <TextField
          label="이메일"
          type="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          autoComplete="email"
          placeholder="example@email.com"
        />

        <InlineError error={submitError} className="mt-1" />

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting && <Spinner />}
          {submitting ? '가입 중...' : '가입하고 시작하기'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        이미 계정이 있나요?{' '}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
