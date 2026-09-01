import { Link } from 'react-router-dom';

/**
 * 404 (F-2)
 *
 * 지금까지는 없는 주소로 가면 흰 화면만 나왔습니다. (Landing 의 "가입" 링크가
 * /register 를 가리키는데 그런 라우트가 없어서 실제로 자주 발생했습니다.)
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl font-extrabold text-gray-200">404</p>
      <h1 className="text-xl font-extrabold text-gray-900">페이지를 찾을 수 없어요</h1>
      <p className="max-w-sm text-sm leading-relaxed text-gray-500">
        주소가 바뀌었거나 삭제된 페이지일 수 있어요.
        <br />
        아래 버튼으로 돌아가 주세요.
      </p>
      <div className="mt-2 flex gap-2">
        <Link
          to="/"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
        >
          첫 화면으로
        </Link>
        <Link
          to="/dashboard"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          대시보드로
        </Link>
      </div>
    </div>
  );
}
