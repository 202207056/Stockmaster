# 06. 한국투자증권 Open API 연동 가이드 (시세 전용)

> **본 프로젝트에서 KIS Open API는 "시세 데이터 조회" 용도로만 사용합니다.**
> 계좌·주문·체결·잔고는 전부 자체 구현하므로, KIS의 주문 관련 TR은 사용하지 않습니다.
> 작성 2026-08-25 · **개정 2026-08-25 (현행 구현 반영)**

> ⚠️ **개정 안내**: 최초 작성 시 "KIS 연동 진척 0%"로 판단했으나, 실제로는
> `gp-mock-inv/backend/app/services/kis_service.py`에 **연동이 이미 구현되어 동작 중**입니다.
> 본 문서는 **현행 구현 리뷰 + 보강 항목** 중심으로 전면 수정했습니다.

> ⚠️ 아래의 URL·TR_ID·유량 제한 수치는 참고용입니다. KIS는 스펙을 수시로 변경하므로
> **반드시 공식 포털의 최신 문서와 대조**하고, 확인한 값은 이 문서에 갱신해 주세요.
> - 공식 포털: https://apiportal.koreainvestment.com
> - 공식 예제 저장소: `koreainvestment/open-trading-api` (GitHub)

---

## 1. 현행 구현 현황

`app/services/kis_service.py` (210줄)

| 기능 | 상태 | 비고 |
|---|:--:|---|
| APP KEY / SECRET 발급 | ✅ | `.env` 관리, 배포본 동작으로 확인 |
| 접근토큰 발급 (`/oauth2/tokenP`) | ✅ | |
| **토큰 23시간 캐시** | ✅ | 모듈 전역 dict. **가장 잘한 부분** |
| 현재가 조회 (`FHKST01010100`) | ✅ | 응답을 내부 dict로 정규화 |
| 일/주/월봉 (`FHKST01010400`) | 🟡 | 최근 약 30일치만 반환 (§4) |
| 키 미설정 시 안내 응답 | ✅ | `current_price: 0` + 메시지 반환 |
| KIS 오류 로그 출력 | ✅ | `print()` 기반 |
| **시세 캐시** | 🔴 | 없음 — 요청마다 KIS 직접 호출 |
| **유량 제한(rate limit)** | 🔴 | 없음 |
| **재시도·백오프** | 🔴 | 없음 (`raise_for_status()`만) |
| **TLS 검증** | 🔴 | `verify=False` |
| 호가 조회 | 🔴 | 미구현 |
| 지수(코스피/코스닥) | 🔴 | 미구현 — 대시보드 상단 카드가 비어 있음 |
| 랭킹(거래대금/급등락) | 🔴 | 미구현 — 대시보드 랭킹 섹션이 비어 있음 |
| 폴백/데모 모드 | 🔴 | 없음 — **휴장일·장마감 시 시연 불가** |
| `price_history` 적재 | 🔴 | 테이블은 있으나 **데이터 0건** |

### 🔑 키 관리 규칙 (팀 필수 준수)
1. `.env`는 커밋하지 않는다. → `gp-mock-inv/.gitignore`에 `.env` 있음 ✅ / **루트 `.gitignore`에는 없음** 🔴
2. 키는 단톡방에 붙여넣지 않는다 (검색·유출 위험). 1:1 또는 학교 계정 메일로.
3. 실수로 커밋했다면 → **즉시 포털에서 키 재발급** + `git filter-repo`로 이력 제거.
4. Render 환경변수에 등록된 키와 로컬 `.env`의 키를 동일하게 유지.

---

## 2. 도메인 선택 — 현행 재검토

```python
# 현행 kis_service.py
KIS_BASE_URL = "https://openapivts.koreainvestment.com:29443"   # 모의투자 도메인
```

| 구분 | 도메인 | 본 프로젝트 적합성 |
|---|---|---|
| 실전투자 | `https://openapi.koreainvestment.com:9443` | ✅ **권장**. 시세만 조회하므로 실주문 위험 없음. 유량이 여유롭고 지원 TR이 많음 |
| 모의투자 | `https://openapivts.koreainvestment.com:29443` | 🟡 **현행**. 유량 제한이 더 엄격하고 일부 시세 TR 미지원 |

**권고: 실전 도메인으로 전환하세요.** 우리는 체결을 자체 구현하므로 모의 도메인을 쓸 이유가 없습니다.
지수·랭킹·호가 등 앞으로 추가할 TR이 모의 도메인에서 지원되지 않을 가능성도 있습니다.

```ini
# .env
KIS_BASE_URL=https://openapi.koreainvestment.com:9443
```
```python
KIS_BASE_URL = settings.KIS_BASE_URL      # 하드코딩 제거
```

### 실주문 사고 방지 장치 (권장)
```python
ALLOWED_TR_PREFIX = ("FHK", "FHP", "HHD", "CTP")   # 조회 계열만
if not tr_id.startswith(ALLOWED_TR_PREFIX):
    raise RuntimeError(f"주문/계좌 TR은 이 프로젝트에서 사용 금지: {tr_id}")
```
> `.env`의 `KIS_ACCOUNT_NO`도 **제거**하세요. 시세 전용인데 계좌번호가 있으면 오해와 사고의 소지가 됩니다.

---

## 3. 인증 (접근토큰) — 현행 리뷰

### 현행 구현 ✅
```python
_token_cache: dict = {}          # 모듈 전역

async def get_kis_token() -> str:
    now = datetime.utcnow()
    if _token_cache.get("token") and now < _token_cache["expires_at"]:
        return _token_cache["token"]                 # 재사용 ✅
    ...
    _token_cache["expires_at"] = now + timedelta(hours=23)
```

**토큰 유효기간 24시간, 짧은 시간 내 반복 발급 제한**이라는 KIS의 함정을 이미 피했습니다.
초보 팀이 가장 많이 걸리는 부분인데 잘 대응했습니다.

### 보강할 3가지

**① 동시 갱신 경합 방지** — 토큰 만료 순간에 요청이 여러 개 들어오면 동시에 발급을 시도합니다.
```python
import asyncio
_token_lock = asyncio.Lock()

async def get_kis_token() -> str:
    if _valid(_token_cache):
        return _token_cache["token"]
    async with _token_lock:
        if _valid(_token_cache):      # 더블 체크
            return _token_cache["token"]
        return await _issue()
```

**② 프로세스 재시작 시 토큰 소실** — Render는 유휴 시 인스턴스를 재우므로, 깨어날 때마다
토큰을 새로 발급합니다. 하루 여러 번 재시작되면 발급 한도에 걸릴 수 있습니다.
→ 토큰을 **DB(또는 파일)에 저장**해 재시작 후에도 재사용하세요.

```python
# 간단한 방법: 전용 테이블 1행에 저장
CREATE TABLE kis_token (
    id INTEGER PRIMARY KEY DEFAULT 1,
    access_token VARCHAR(500) NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);
```

**③ `datetime.utcnow()` → `datetime.now(timezone.utc)`** (deprecated 대응)

### 공통 요청 헤더 (현행 정확 ✅)
```http
authorization: Bearer {access_token}
appkey: {APP_KEY}
appsecret: {APP_SECRET}
tr_id: {TR_ID}
custtype: P
```

---

## 4. TR 목록 — 현행 + 추가 필요

| 기능 | 엔드포인트 | TR_ID | 현황 |
|---|---|---|:--:|
| 주식 현재가 시세 | `/uapi/domestic-stock/v1/quotations/inquire-price` | `FHKST01010100` | ✅ 구현 |
| 일별 시세 | `/uapi/domestic-stock/v1/quotations/inquire-daily-price` | `FHKST01010400` | 🟡 구현 (제한 있음) |
| **기간별 시세(권장)** | `.../inquire-daily-itemchartprice` | `FHKST03010100` | 🔴 **교체 권장** |
| 분봉 | `.../inquire-time-itemchartprice` | `FHKST03010200` | 🔴 미구현 |
| 호가/예상체결 | `.../inquire-asking-price-exp-ccn` | `FHKST01010200` | 🔴 미구현 |
| 거래량 순위 | `.../volume-rank` | `FHPST01710000` | 🔴 미구현 |
| 등락률 순위 | `.../fluctuation` 계열 | (확인 필요) | 🔴 미구현 |
| 업종/지수 시세 | `.../inquire-index-price` 계열 | `FHPUP02100000` | 🔴 미구현 |

> TR_ID와 파라미터명은 **공식 문서에서 반드시 확인**하세요. 확인 결과를 이 표에 ✅로 갱신하면
> 팀 전체가 시간을 아낍니다.

### 🟡 차트 API 교체 권장

```python
# 현행 — inquire-daily-price (FHKST01010400)
#   기간 지정 불가, 최근 약 30건만 반환 → 캔들차트가 한 달치밖에 안 그려짐

# 권장 — inquire-daily-itemchartprice (FHKST03010100)
params = {
    "FID_COND_MRKT_DIV_CODE": "J",
    "FID_INPUT_ISCD": symbol_code,
    "FID_INPUT_DATE_1": start_date,   # YYYYMMDD  ← 기간 지정 가능
    "FID_INPUT_DATE_2": end_date,
    "FID_PERIOD_DIV_CODE": period,    # D / W / M / Y
    "FID_ORG_ADJ_PRC": "0",
}
# 응답은 output1(요약) + output2(봉 리스트) 구조
```

### 응답 필드 매핑 (현행 정확 ✅)

| KIS 필드 | 의미 | 내부 키 |
|---|---|---|
| `stck_prpr` | 현재가 | `current_price` |
| `prdy_ctrt` | 전일 대비율 | `change_rate` |
| `stck_hgpr` / `stck_lwpr` | 고가 / 저가 | `high` / `low` |
| `acml_vol` | 누적 거래량 | `volume` |
| `stck_sdpr` | 기준가(전일 종가) | 🔴 미수집 — 등락 계산에 필요 |
| `stck_mxpr` / `stck_llam` | 상한가 / 하한가 | 🔴 미수집 — **주문 검증에 필요** |
| `acml_tr_pbmn` | 누적 거래대금 | 🔴 미수집 — 랭킹에 필요 |
| `prdy_vrss` | 전일 대비 | 🔴 미수집 |

> ⚠️ KIS 응답의 숫자는 **전부 문자열**로 옵니다. 현행은 `int()`/`float()`로 변환하고 있는데,
> **금액은 `Decimal`로 다루세요.** `float`은 계산 오차가 누적됩니다.

---

## 5. 유량 제한(Rate Limit) 대응 ★ 최우선 보강

현재는 `/api/stocks/{code}/price` 요청마다 KIS를 직접 호출합니다.
프론트가 3초 폴링을 시작하고 사용자가 10명만 되어도 **초당 3~4건**, 대시보드가 랭킹까지 그리면
즉시 한도를 넘습니다. **폴링을 붙이기 전에 캐시를 먼저 넣으세요.**

### 방어 5중 구조

```text
[1] 프론트 폴링 간격 제한        3~5초, 탭 비활성 시 중단 (Page Visibility API)
        ↓
[2] 서버 캐시                    현재가 TTL 5초 · 봉 TTL 60초 · 종목정보 TTL 1일
        ↓                        → 캐시 히트면 KIS 호출 0건
[3] 요청 병합 (single-flight)    같은 종목 동시 요청 N건 → KIS 호출 1건
        ↓
[4] 레이트 리미터                asyncio.Semaphore로 초당 N건 이하 강제
        ↓
[5] 재시도/백오프 + 폴백         429/5xx면 지수 백오프, 최종 실패 시 마지막 캐시값 반환
                                 (응답에 is_delayed=true 표시)
```

### 최소 구현 — 이 30줄이 프로젝트의 생존을 좌우합니다

```python
# app/services/kis_service.py 에 추가
import asyncio
from datetime import datetime, timedelta, timezone

_quote_cache: dict[str, tuple[dict, datetime]] = {}
_inflight: dict[str, asyncio.Future] = {}
_sem = asyncio.Semaphore(8)                      # 초당 동시 호출 상한
QUOTE_TTL = timedelta(seconds=5)


def _now():
    return datetime.now(timezone.utc)


async def get_current_price(symbol_code: str) -> dict:
    # [2] 캐시 히트
    hit = _quote_cache.get(symbol_code)
    if hit and _now() - hit[1] < QUOTE_TTL:
        return {**hit[0], "is_cached": True}

    # [3] 동일 종목 동시 요청 병합
    if symbol_code in _inflight:
        return await _inflight[symbol_code]

    fut = asyncio.get_event_loop().create_future()
    _inflight[symbol_code] = fut
    try:
        async with _sem:                          # [4] 유량 제한
            data = await _fetch_price_from_kis(symbol_code)   # 기존 호출 로직
        _quote_cache[symbol_code] = (data, _now())
        fut.set_result(data)
        return data
    except Exception as e:
        # [5] 폴백 — 마지막 캐시값이라도 돌려준다 (화면이 죽지 않게)
        if hit:
            stale = {**hit[0], "is_delayed": True}
            fut.set_result(stale)
            return stale
        fut.set_exception(e)
        raise
    finally:
        _inflight.pop(symbol_code, None)
```

### 캐시 TTL 권장값

| 데이터 | TTL | 근거 |
|---|---|---|
| 현재가 | 5초 (장중) / 60초 (장외) | 모의투자에 5초 지연은 충분 |
| 호가 | 3초 | |
| 분봉 | 60초 | 봉이 1분마다 확정 |
| 일봉 | 1시간 (장중) / 장마감 후 1회 확정 적재 | |
| 랭킹 | 30초 | 대시보드 전용 |
| 지수 | 10초 | |
| 종목마스터 | 1일 | 배치 갱신 |

### 폴링 대상 축소
전 종목을 갱신하지 말고 **필요한 종목만** 갱신합니다.
```text
갱신 대상 = 관심종목 ∪ 미체결 주문 종목 ∪ 보유 종목 ∪ 인기 랭킹 상위 30
```

### 💡 부수 효과
`/api/trading/portfolio`에서 보유 종목마다 현재가를 조회할 때도 이 캐시가 그대로 쓰입니다.
보유 종목 10개면 KIS 호출 10건이 아니라 캐시 히트 대부분이 됩니다.

---

## 6. TLS 검증 (`verify=False`) 처리

```python
# 현행 — 2곳
async with httpx.AsyncClient(verify=False) as client:
```
중간자 공격에 노출되며, **여기로 APP KEY와 SECRET이 흘러갑니다.**
주석에 "인증서 호스트명 불일치 우회"라 되어 있으니, 아래 순서로 시도하세요.

1. `pip install -U certifi` — 대개 이것으로 해결됩니다
2. **실전 도메인으로 전환** (§2) — 인증서 이슈 보고가 적습니다
3. 그래도 안 되면 **개발 환경에서만** 비활성화

```python
_VERIFY = settings.APP_ENV != "local"

async def _client():
    return httpx.AsyncClient(verify=_VERIFY, timeout=5.0)
```

> 추가로 **`AsyncClient`를 요청마다 새로 만들지 마세요.** 연결 재사용이 안 되어 느립니다.
> 모듈 전역에 하나 만들어 재사용하고, 앱 종료 시 닫는 구조로 바꾸세요.

---

## 7. 장 운영시간 및 휴장일 처리 (현행 없음)

| 구간 | 시각(KST) | 처리 |
|---|---|---|
| 장 시작 동시호가 | 08:30 ~ 09:00 | 주문 접수는 받되 체결은 09:00에 |
| 정규장 | 09:00 ~ 15:30 | 정상 체결 |
| 장 마감 동시호가 | 15:20 ~ 15:30 | 단순화 시 정규장과 동일 처리 |
| 시간외 | 15:40 ~ 18:00 | **1단계 범위에서 제외 권장** |
| 장외/휴장 | 그 외 | `MARKET_CLOSED` 반환 |

- 휴장일은 `market_calendar` 테이블에 미리 적재 (2026년 공휴일 + 임시휴장)
- 서버 타임존을 **`Asia/Seoul`로 고정** (`TZ=Asia/Seoul`, Render 환경변수에도 설정)
- 현행은 `datetime.utcnow()`를 쓰므로 **거래 시각이 9시간 어긋나 표시**됩니다

```python
# app/services/market_calendar.py (신설)
KST = timezone(timedelta(hours=9))

def is_market_open(now: datetime | None = None) -> bool:
    now = (now or datetime.now(KST)).astimezone(KST)
    if now.weekday() >= 5:                      # 토·일
        return False
    if is_holiday(now.date()):                  # market_calendar 조회
        return False
    return time(9, 0) <= now.time() <= time(15, 30)
```

---

## 8. 폴백/데모 모드 (필수 안전장치) 🔴 미구현

**졸업작품 발표가 장 마감 후나 주말이면 시세가 전혀 움직이지 않습니다.**
KIS 장애, 키 만료, Render 콜드스타트까지 겹치면 시연 자체가 불가능합니다.

| 모드 | 동작 | 설정 |
|---|---|---|
| `LIVE` | KIS 실시간 조회 | `MARKET_MODE=LIVE` |
| `REPLAY` | `price_history`에 적재된 과거 봉을 시간축에 따라 재생 | `MARKET_MODE=REPLAY` |
| `MOCK` | 마지막 종가 기준 난수 워크로 가격 생성 | `MARKET_MODE=MOCK` |

```python
# app/services/market_provider.py (신설)
class MarketProvider(Protocol):
    async def get_price(self, symbol: str) -> dict: ...
    async def get_chart(self, symbol: str, period: str) -> list[dict]: ...

def get_provider() -> MarketProvider:
    return {
        "LIVE":   KISProvider(),
        "REPLAY": ReplayProvider(),   # price_history 조회
        "MOCK":   MockProvider(),     # 난수 워크
    }[settings.MARKET_MODE]
```

라우터와 서비스는 `get_provider()`만 호출하도록 바꾸면, **환경변수 하나로 모드 전환**이 됩니다.

### 부수 효과: 테스트가 가능해집니다
`MockProvider`로 시세를 고정하면 **KIS 없이 체결 엔진 단위 테스트 12종**(`07` 문서 §9)을
전부 돌릴 수 있습니다. 폴백과 테스트를 한 번에 해결하는 구조입니다.

> 🔴 **이 폴백이 없으면 11월 시연에서 화면이 멈춥니다. 반드시 만드세요.**

---

## 9. 종목마스터 및 시세 이력 적재

### 종목마스터 — 시드 준비됨 ✅
`gp-mock-inv/item_master_seed.sql`에 **코스피 대표 30종목**이 준비되어 있습니다.

**보강 권고**: 30종목은 시연에는 충분하지만 "종목 검색"의 설득력이 약합니다.
**KOSPI 상위 200 + KOSDAQ 인기 100 = 약 300종목**으로 늘리세요.
- KRX 정보데이터시스템 상장법인목록 CSV → `item_master` 적재
- 전 종목(약 2,600개)은 불필요합니다. "학습용이므로 대표 300종목으로 한정"은 설명 가능한 설계 판단입니다.
- 이때 `market`(KOSPI/KOSDAQ) 컬럼도 함께 채우세요 (`04` 문서 §3-2).

### `price_history` — 테이블만 있고 데이터 0건 🔴
현행은 차트를 요청할 때마다 KIS를 호출하고, DB에는 아무것도 저장하지 않습니다.

```python
# app/workers/jobs/daily_candle.py (신설) — 매일 15:40 실행
async def load_daily_candles():
    for stock in active_stocks():
        candles = await provider.get_chart(stock.symbol_code, "D")
        for c in candles:
            upsert_price_history(stock.symbol_code, "D", c)   # uq_price로 중복 방지
```

**이것을 해두면 얻는 것**
1. 차트 조회가 KIS를 타지 않음 → 유량 절약 + 응답 빨라짐
2. `REPLAY` 모드의 재생 데이터가 됨 (§8)
3. 과거 수익률 재현·백테스트 가능

---

## 10. 개선된 `kis_service` 구조 (목표)

```text
app/services/
├── market_provider.py     # Protocol + get_provider()  ← 라우터는 이것만 호출
├── kis/
│   ├── client.py          # httpx 세션, 헤더, 재시도, 유량제한   ← KIS 필드명은 여기까지만
│   ├── token.py           # 토큰 발급·캐시·DB 저장·락
│   ├── mapper.py          # KIS 응답 → 내부 dict 정규화
│   └── provider.py        # KISProvider (MarketProvider 구현)
├── replay_provider.py     # price_history 재생
└── mock_provider.py       # 난수 워크
```

> **원칙**: `stck_prpr` 같은 KIS 필드명은 `mapper.py` 밖으로 절대 나가지 않게 하세요.
> 현행도 이미 정규화를 하고 있으므로(👏), 파일만 분리하면 됩니다.

---

## 11. 검증 체크리스트

| # | 항목 | 현황 |
|:--:|---|:--:|
| 1 | 토큰 발급 성공 | ✅ 완료 |
| 2 | 삼성전자 현재가 조회 성공 | ✅ 완료 |
| 3 | 재실행 시 토큰 재발급이 일어나지 않음 | ✅ 완료 |
| 4 | 일봉 조회 성공 | ✅ 완료 |
| 5 | `GET /api/stocks/005930/price` 200 응답 | ✅ 완료 |
| 6 | **같은 요청 5회 연속 시 KIS 호출 로그가 1회만** | 🔴 **미달** (캐시 없음) |
| 7 | **`MARKET_MODE=MOCK`으로 바꿔도 동일 API 동작** | 🔴 **미달** (폴백 없음) |
| 8 | 상한가·하한가·기준가 수집 | 🔴 미달 |
| 9 | 호가 10단계 조회 | 🔴 미달 |
| 10 | 지수(코스피/코스닥) 조회 | 🔴 미달 |
| 11 | 랭킹(거래대금/등락률) 조회 | 🔴 미달 |
| 12 | 장 운영시간 판정 | 🔴 미달 |
| 13 | `price_history` 일봉 적재 배치 | 🔴 미달 |

> **6번과 7번이 가장 중요합니다.** 6번은 서비스 생존, 7번은 시연 생존이 걸려 있습니다.

### 보강 순서 (권장)
| 순서 | 작업 | 소요 |
|:--:|---|---|
| 1 | 시세 캐시 + 유량 제한 (§5) | 반나절 |
| 2 | `verify=False` 환경별 분리 + 클라이언트 재사용 (§6) | 1시간 |
| 3 | 실전 도메인 전환 + `KIS_BASE_URL` 설정화 (§2) | 1시간 |
| 4 | 상한가·기준가·거래대금 필드 추가 수집 (§4) | 1시간 |
| 5 | `MarketProvider` + MOCK 폴백 (§8) | 1일 |
| 6 | 장 운영시간 판정 (§7) | 반나절 |
| 7 | 차트 API를 `FHKST03010100`으로 교체 (§4) | 반나절 |
| 8 | 지수·랭킹·호가 TR 추가 (§4) | 2일 |
| 9 | 일봉 적재 배치 + `REPLAY` (§9) | 1일 |
