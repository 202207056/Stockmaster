import { Link } from 'react-router-dom';

/**
 * "로그인하면 볼 수 있어요" 안내 (F-8 확장)
 *
 * 로그인 없이도 모든 화면이 열리도록 바뀌면서(config/features.js) 필요해진 컴포넌트입니다.
 * 화면 자체는 보여 주되, 개인 데이터가 들어갈 자리에는 빈칸이나 무한 스켈레톤 대신
 * "왜 비어 있는지"를 한 줄로 설명합니다.
 *
 * 로딩 스켈레톤과 구분되어야 합니다.
 *   - 스켈레톤 = 곧 값이 옴
 *   - 이 컴포넌트 = 로그인 전에는 값이 오지 않음
 */
export default function LoginNotice({
  message = '로그인하면 내 정보가 표시돼요',
  className = '',
  compact = false,
}) {
  if (compact) {
    return (
      <span className={`text-sm text-gray-400 ${className}`}>
        {message}{' '}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          로그인
        </Link>
      </span>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-200 px-6 py-10 text-center ${className}`}
    >
      <div className="text-2xl" aria-hidden="true">
        🔒
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      <div className="flex gap-2">
        <Link
          to="/login"
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          로그인
        </Link>
        <Link
          to="/signup"
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
        >
          회원가입
        </Link>
      </div>
    </div>
  );
}
