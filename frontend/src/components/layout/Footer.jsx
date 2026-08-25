/**
 * 공통 푸터 (F-5)
 *
 * 기존 Landing.jsx 의 푸터는 "주제 / 페이지 / 페이지" 같은 자리표시 링크뿐이었습니다.
 * 아무 데도 가지 않는 링크는 지우고, 지금 사실인 정보만 남겼습니다.
 *
 * 아래 안내 문구는 법적 고지 성격이므로 임의로 줄이거나 바꾸지 마세요.
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white">
      <div className="mx-auto w-full max-w-page px-8 py-10">
        <p className="text-base font-extrabold text-gray-800">인생한방</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
          가상 자금으로 거래를 연습할 수 있는 학습용 모의투자 서비스입니다.
          <br />
          본 서비스에서 제공하는 모든 정보와 자료는 투자 학습을 위한 것이며,
          <br />
          특정 금융상품에 대한 투자 권유 또는 투자 자문을 목적으로 하지 않습니다.
        </p>
        <p className="mt-6 text-xs text-gray-400">© 인생한방 프로젝트</p>
      </div>
    </footer>
  );
}
