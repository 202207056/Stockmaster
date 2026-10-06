# 상세 차트 추가

기존 `kis_service.py`와 `main.py`는 변경하지 않습니다.
`securities.py`의 기존 차트 함수에 선택적인 `range` 옵션과 처리 분기만 추가합니다.
별도 라우터는 등록하지 않습니다.

기존 API 확장: `GET /api/stocks/{code}/chart?range=D|W|M|Y`

`range`를 생략하면 기존 `period=D|W|M` 호출과 가격 배열 응답은 그대로 유지됩니다.
둘 다 전달하면 `range`가 우선합니다. 프론트엔드는 이전 서버가 반환하는 배열도
처리하므로 배포 전에도 기존 차트를 표시할 수 있습니다.

| range | 표시 범위 | 데이터 |
|---|---|---|
| D | 최근 거래일 (모의 API만 있으면 당일) | 1분봉, 시간 역순 분할 조회 |
| W | 최근 거래일 기준 1주 | 과거 분봉을 5분봉으로 집계 |
| M | 최근 3개월 | 일봉 |
| Y | 최근 1년 | 일봉, 최대 100건씩 날짜를 옮겨 조회 |

`range` 지정 시 응답은 `{ rows, range, resolution, notice }`입니다. 분봉 row에는 `date`와
`time`(한국 시간), `open/high/low/close/volume`이 있습니다. 일봉에는 time이 없습니다.
동일 날짜의 다른 분봉을 유지하기 위해 프론트엔드는 날짜와 시간을 합쳐 식별합니다.

기존 설정과 토큰 발급 함수를 그대로 사용합니다. 실전 키 두 개가 있으면 조회 전용
실전 API를 사용하며, 모의 키만 있으면 당일 분봉과 기간별 일봉을 사용합니다.
모의 환경의 1주 차트는 일봉으로 대체하고 `notice`로 알립니다.
누락된 분봉을 가상 가격으로 채우지 않습니다. 실전 키의 권한 오류나 KIS 오류는
빈 데이터로 숨기지 않고 502/503 오류로 전달합니다.

추가 기능의 호출은 순차 처리하고, 결과는 최대 128개·60초 동안 프로세스 안에서
캐시합니다. 기존 시세/순위의 호출 방식은 변경하지 않습니다.

## 검증 및 반영

`python -m unittest discover -s tests -v`

테스트는 가짜 KIS 응답과 독립 FastAPI 앱을 사용하므로 DB나 실제 계정이 필요 없습니다.
분봉·장기간 일봉을 사용하려면 백엔드의 차트 서비스 파일과 기존 라우터 확장분을 배포해야 합니다.
실제 계정의 분봉 응답, 키 권한, 운영 환경 호출 한도는 배포 환경에서 별도 확인이 필요합니다.

공식 참조:
- https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_time_itemchartprice/inquire_time_itemchartprice.py
- https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_time_dailychartprice/inquire_time_dailychartprice.py
- https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_daily_itemchartprice/inquire_daily_itemchartprice.py
