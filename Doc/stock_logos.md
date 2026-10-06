# 종목 로고

`GET /api/stocks/{symbol_code}/logo`는 로그인 없이 사용할 수 있습니다.
응답: `{ "symbol_code": "005930", "logo_url": "https://ssl.pstatic.net/..." }`.
로고가 없거나 네이버 요청이 실패하면 `logo_url`은 `null`입니다.

백엔드는 네이버 증권의 `https://m.stock.naver.com/api/stock/{code}/basic`에서
`itemLogoPngUrl` 또는 `itemLogoUrl`을 조회합니다. 종목 코드로 이미지 경로를 추측하지
않으므로 ETF의 운용 브랜드 로고도 사용할 수 있습니다. 공식 외부 개발자용 API로
보장된 주소는 아니므로 응답 변경 시 서비스 로직을 갱신해야 합니다.

로고 주소는 프로세스별 메모리에 24시간, 누락/실패는 5분간 캐시합니다.
최대 4,096개를 보관하며 동시 네이버 요청은 4개, 동일 종목 요청은 하나로 합칩니다.
프론트엔드는 우리 API에서 받은 주소만 사용하며 이미지 파일은 네이버 CDN에서 로드합니다.
이미지 로딩 실패/미배포 API는 종목명 첫 글자로 대체합니다. KIS 시세 경로는 그대로입니다.

백엔드와 프론트엔드를 각각 배포해야 실제 운영 화면에 반영됩니다.
로컬 미리보기나 별도 API 주소 설정은 필요하지 않습니다.

검증: `backend`에서 `python -m unittest discover -s tests -p test_stock_logos.py -v`.
