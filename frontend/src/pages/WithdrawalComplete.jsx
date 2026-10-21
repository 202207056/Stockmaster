import { Link } from 'react-router-dom';

export default function WithdrawalComplete() {
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
    <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
      <h1 className="text-2xl font-extrabold">회원탈퇴가 완료됐어요</h1>
      <p className="mt-4 text-sm leading-6 text-gray-600">계정과 연결된 데이터가 삭제되었고 로그아웃됐어요.<br />그동안 이용해 주셔서 감사합니다.</p>
      <Link to="/" replace className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-bold text-white">첫 화면으로</Link>
    </section>
  </main>;
}
