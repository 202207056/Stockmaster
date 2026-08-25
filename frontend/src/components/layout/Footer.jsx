/**
 * 공통 푸터 (F-5)
 *
 * 기존 Landing.jsx 의 푸터는 "주제 / 페이지 / 페이지" 같은 자리표시 링크뿐이었습니다.
 * 아무 데도 가지 않는 링크는 지우고, 지금 사실인 정보만 남겼습니다.
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white">
      <div className="mx-auto w-full max-w-page px-8 py-10">
        <p className="text-base font-extrabold text-gray-800">모의투자 학습 플랫폼</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          실제 자금이 오가지 않는 학습용 모의투자 서비스입니다.
          <br />
          화면에 표시되는 시세와 수익률은 투자 권유가 아닙니다.
        </p>
        <p className="mt-6 text-xs text-gray-400">© 2026 졸업작품 프로젝트 팀</p>
      </div>
    </footer>
  );
}
