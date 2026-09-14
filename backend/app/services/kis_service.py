"""
services/kis_service.py - 한국투자증권 오픈API 연동 서비스

사용 도메인
    모의투자 (시세·차트):  https://openapivts.koreainvestment.com:29443
    실전투자 (순위 조회):  https://openapi.koreainvestment.com:9443

안전장치
    _assert_read_only(): 주문·계좌 TR이 실수로 호출되면 즉시 RuntimeError를 발생시킨다.
    실전 계좌는 잔액 0원·미수 미약정으로 유지하는 것이 최후 방어선이다.

토큰 관리
    KIS 토큰은 발급 한도가 있으므로 메모리에 캐시해 23시간 동안 재사용한다.
    모의투자·실전투자 토큰은 별도 캐시로 관리한다.
"""

import asyncio
from datetime import datetime, timedelta

import httpx

from app.config import settings

# ── 도메인 상수 ──────────────────────────────────────────────
KIS_MOCK_URL = "https://openapivts.koreainvestment.com:29443"   # 모의투자
KIS_REAL_URL = "https://openapi.koreainvestment.com:9443"       # 실전투자

# ── 토큰 캐시 (모의·실전 분리) ───────────────────────────────
_mock_token_cache: dict = {}
_real_token_cache: dict = {}

# ── 허용된 TR 접두사 (조회 계열만) ───────────────────────────
# 주문 TR은 TTTC (실전) / VTTC (모의) 접두사를 사용하므로 아래에 포함되지 않는다.
_ALLOWED_TR_PREFIXES = ("FHK", "FHP", "HHD", "CTP", "FHPST")


def _assert_read_only(tr_id: str) -> None:
    """
    주문·계좌 TR이 실수로 호출되는 것을 코드 레벨에서 차단한다.

    실전 계좌 키를 사용하므로 주문 TR이 실행되면 실제 체결로 이어진다.
    화이트리스트에 없는 TR_ID는 즉시 RuntimeError를 발생시킨다.
    """
    if not any(tr_id.startswith(prefix) for prefix in _ALLOWED_TR_PREFIXES):
        raise RuntimeError(
            f"주문·계좌 TR은 사용 금지: {tr_id}. "
            "이 프로젝트는 시세·순위 조회 전용입니다."
        )


# ── 모의투자 토큰 ─────────────────────────────────────────────

async def get_kis_token() -> str:
    """
    모의투자 API 토큰을 반환한다.
    유효하면 캐시된 토큰을 재사용하고, 만료됐으면 새로 발급한다.
    """
    now = datetime.utcnow()
    if (
        _mock_token_cache.get("token")
        and _mock_token_cache.get("expires_at")
        and now < _mock_token_cache["expires_at"]
    ):
        return _mock_token_cache["token"]

    # 모의투자 서버는 SSL 인증서 호스트명 불일치 문제가 있어 verify=False 유지
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.post(
            f"{KIS_MOCK_URL}/oauth2/tokenP",
            json={
                "grant_type": "client_credentials",
                "appkey": settings.KIS_APP_KEY,
                "appsecret": settings.KIS_APP_SECRET,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    _mock_token_cache["token"] = data["access_token"]
    _mock_token_cache["expires_at"] = now + timedelta(hours=23)
    return data["access_token"]


# ── 실전투자 토큰 ─────────────────────────────────────────────

async def get_real_kis_token() -> str:
    """
    실전투자 API 토큰을 반환한다. (순위 조회 전용)
    실전 도메인은 SSL이 정상이므로 verify=False 불필요.
    """
    now = datetime.utcnow()
    if (
        _real_token_cache.get("token")
        and _real_token_cache.get("expires_at")
        and now < _real_token_cache["expires_at"]
    ):
        return _real_token_cache["token"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{KIS_REAL_URL}/oauth2/tokenP",
            json={
                "grant_type": "client_credentials",
                "appkey": settings.KIS_REAL_APP_KEY,
                "appsecret": settings.KIS_REAL_APP_SECRET,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    _real_token_cache["token"] = data["access_token"]
    _real_token_cache["expires_at"] = now + timedelta(hours=23)
    return data["access_token"]


# ── 현재가 조회 (모의투자 키) ─────────────────────────────────

async def get_current_price(symbol_code: str) -> dict:
    """
    국내 주식 현재가를 조회한다.

    Returns:
        {
            "symbol_code": "005930",
            "current_price": 75000,
            "change_rate": 1.5,
            "high": 76000,
            "low": 74500,
            "volume": 15000000
        }
    """
    if not settings.KIS_APP_KEY:
        return {
            "symbol_code": symbol_code,
            "current_price": 0,
            "change_rate": 0.0,
            "message": "KIS API 키가 설정되지 않았습니다.",
        }

    tr_id = "FHKST01010100"
    _assert_read_only(tr_id)

    token = await get_kis_token()

    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(
            f"{KIS_MOCK_URL}/uapi/domestic-stock/v1/quotations/inquire-price",
            headers={
                "authorization": f"Bearer {token}",
                "appkey": settings.KIS_APP_KEY,
                "appsecret": settings.KIS_APP_SECRET,
                "tr_id": tr_id,
                "custtype": "P",
            },
            params={
                "FID_COND_MRKT_DIV_CODE": "J",
                "FID_INPUT_ISCD": symbol_code,
            },
        )
        if resp.status_code >= 400:
            print(f"[KIS 현재가 오류] status={resp.status_code} body={resp.text}")
        resp.raise_for_status()
        output = resp.json().get("output", {})

    return {
        "symbol_code": symbol_code,
        "current_price": int(output.get("stck_prpr", 0)),
        "change_rate": float(output.get("prdy_ctrt", 0)),
        "high": int(output.get("stck_hgpr", 0)),
        "low": int(output.get("stck_lwpr", 0)),
        "volume": int(output.get("acml_vol", 0)),
    }


# ── 차트 데이터 조회 (모의투자 키) ───────────────────────────

async def get_stock_chart(symbol_code: str, period: str = "D") -> list[dict]:
    """
    주식 일봉/주봉/월봉 차트 데이터를 반환한다.

    Args:
        period: "D"(일봉), "W"(주봉), "M"(월봉)
    """
    if not settings.KIS_APP_KEY:
        return []

    tr_id = "FHKST01010400"
    _assert_read_only(tr_id)

    token = await get_kis_token()

    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(
            f"{KIS_MOCK_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-price",
            headers={
                "authorization": f"Bearer {token}",
                "appkey": settings.KIS_APP_KEY,
                "appsecret": settings.KIS_APP_SECRET,
                "tr_id": tr_id,
                "custtype": "P",
            },
            params={
                "FID_COND_MRKT_DIV_CODE": "J",
                "FID_INPUT_ISCD": symbol_code,
                "FID_PERIOD_DIV_CODE": period,
                "FID_ORG_ADJ_PRC": "0",
            },
        )
        resp.raise_for_status()
        raw = resp.json()
        output = raw.get("output", [])

    return [
        {
            "date": item.get("stck_bsop_date"),
            "open": int(item.get("stck_oprc", 0)),
            "high": int(item.get("stck_hgpr", 0)),
            "low": int(item.get("stck_lwpr", 0)),
            "close": int(item.get("stck_clpr", 0)),
            "volume": int(item.get("acml_vol", 0)),
        }
        for item in output
    ]


# ── 종목 순위 조회 (실전투자 키) ──────────────────────────────

async def get_stock_ranking(rank_type: str = "volume", limit: int = 10) -> list[dict]:
    """
    국내 주식 종목 순위를 조회한다. (실전 API 전용)

    Args:
        rank_type:
            "volume"   — 거래량 상위 (FHPST01710000)
            "change"   — 급등 상위   (FHPST01700000, 상승 기준)
            "amount"   — 거래대금 상위 (FHPST01710000, 거래대금 기준)
        limit: 반환할 종목 수 (최대 30)

    Returns:
        [
            {
                "rank": 1,
                "symbol_code": "005930",
                "name": "삼성전자",
                "price": 75000,
                "change_rate": 1.5,
                "volume": 15000000
            },
            ...
        ]
    """
    if not settings.KIS_REAL_APP_KEY:
        return []

    # 순위 타입별 TR_ID·엔드포인트·파라미터 결정
    # volume / amount 는 같은 API를 쓰되, FID_BLNG_CLS_CODE 만 다르게 보낸다.
    #   0 = 평균거래량(인기 종목)  3 = 거래금액순(거래대금)
    # change 는 등락률 API라 파라미터 구조가 다르다. 기존 값은 그대로 둔다.
    if rank_type == "change":
        tr_id = "FHPST01700000"
        path = "/uapi/domestic-stock/v1/ranking/fluctuation"
        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_COND_SCR_DIV_CODE": "20170",
            "FID_INPUT_ISCD": "0000",
            "FID_RANK_SORT_CLS_CODE": "0",   # 0 = 상승률 순
            "FID_INPUT_CNT_1": "0",
            "FID_PRC_CLS_CODE": "0",
            "FID_INPUT_PRICE_1": "",
            "FID_INPUT_PRICE_2": "",
            "FID_VOL_CNT": "",
            "FID_TRGT_CLS_CODE": "0",
            "FID_TRGT_EXLS_CLS_CODE": "0",
            "FID_DIV_CLS_CODE": "0",
            "FID_RSFL_RATE1": "",
            "FID_RSFL_RATE2": "",
        }
    elif rank_type == "amount":
        tr_id = "FHPST01710000"
        path = "/uapi/domestic-stock/v1/quotations/volume-rank"
        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_COND_SCR_DIV_CODE": "20171",
            "FID_INPUT_ISCD": "0000",
            "FID_BLNG_CLS_CODE": "3",  # 거래금액순
            "FID_TRGT_CLS_CODE": "111111111",
            "FID_TRGT_EXLS_CLS_CODE": "000000",
            "FID_INPUT_PRICE_1": "",
            "FID_INPUT_PRICE_2": "",
            "FID_VOL_CNT": "",
            "FID_INPUT_DATE_1": "",
            "FID_DIV_CLS_CODE": "0",
        }
    else:
        # volume (기본값) — 기존 파라미터 유지
        tr_id = "FHPST01710000"
        path = "/uapi/domestic-stock/v1/quotations/volume-rank"
        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_COND_SCR_DIV_CODE": "20171",
            "FID_INPUT_ISCD": "0000",
            "FID_BLNG_CLS_CODE": "0",  # 평균거래량
            "FID_TRGT_CLS_CODE": "111111111",
            "FID_TRGT_EXLS_CLS_CODE": "000000",
            "FID_INPUT_PRICE_1": "",
            "FID_INPUT_PRICE_2": "",
            "FID_VOL_CNT": "",
            "FID_INPUT_DATE_1": "",
            "FID_DIV_CLS_CODE": "0",
        }

    _assert_read_only(tr_id)

    try:
        token = await get_real_kis_token()
    except Exception as e:
        print(f"[KIS 실전 토큰 오류] {e}")
        return []

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{KIS_REAL_URL}{path}",
                headers={
                    "authorization": f"Bearer {token}",
                    "appkey": settings.KIS_REAL_APP_KEY,
                    "appsecret": settings.KIS_REAL_APP_SECRET,
                    "tr_id": tr_id,
                    "custtype": "P",
                },
                params=params,
            )
            if resp.status_code >= 400:
                print(f"[KIS 순위 오류] type={rank_type} status={resp.status_code} body={resp.text}")
                return []
            raw = resp.json()
            print(f"[KIS 순위 응답] type={rank_type} rt_cd={raw.get('rt_cd')} msg={raw.get('msg1')} keys={list(raw.keys())}")
            output = raw.get("output", raw.get("output1", []))
    except Exception as e:
        print(f"[KIS 순위 요청 오류] {e}")
        return []

    result = []
    for i, item in enumerate(output[:limit]):
        try:
            result.append({
                "rank": i + 1,
                "symbol_code": item.get("mksc_shrn_iscd", item.get("stck_shrn_iscd", "")),
                "name": item.get("hts_kor_isnm", ""),
                "price": int(item.get("stck_prpr", 0)),
                "change_rate": float(item.get("prdy_ctrt", 0)),
                "volume": int(item.get("acml_vol", 0)),
                "amount": int(item.get("acml_tr_pbmn", 0)),  # 거래대금
            })
        except (ValueError, TypeError):
            continue

    return result


# ── 주요 시세 (실전투자 키) ───────────────────────────────────
# 홈 상단 카드용. 코스피·코스닥만 KIS에서 가져오고, 나머지는 null로 둔다.
# 프론트는 value 가 null 이면 "준비 중"을 그대로 보여 주면 된다.

_INDEX_SLOTS = [
    {"code": "kospi", "name": "코스피", "kis_code": "0001"},
    {"code": "kosdaq", "name": "코스닥", "kis_code": "1001"},
    {"code": "nasdaq", "name": "나스닥", "kis_code": None},
    {"code": "sp500", "name": "S&P 500", "kis_code": None},
    {"code": "gold", "name": "금", "kis_code": None},
    {"code": "usd", "name": "달러", "kis_code": None},
]
_index_cache: dict = {}


def _to_float(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


async def get_index_price(kis_code: str) -> dict | None:
    """
    국내 업종 현재지수를 조회한다. (실전 API 전용)

    kis_code:
        0001 코스피, 1001 코스닥
    """
    if not settings.KIS_REAL_APP_KEY:
        return None

    tr_id = "FHPUP02100000"
    _assert_read_only(tr_id)

    try:
        token = await get_real_kis_token()
    except Exception as e:
        print(f"[KIS 지수 토큰 오류] {e}")
        return None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{KIS_REAL_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price",
                headers={
                    "authorization": f"Bearer {token}",
                    "appkey": settings.KIS_REAL_APP_KEY,
                    "appsecret": settings.KIS_REAL_APP_SECRET,
                    "tr_id": tr_id,
                    "custtype": "P",
                },
                params={
                    "FID_COND_MRKT_DIV_CODE": "U",
                    "FID_INPUT_ISCD": kis_code,
                },
            )
            if resp.status_code >= 400:
                print(f"[KIS 지수 오류] code={kis_code} status={resp.status_code} body={resp.text}")
                return None
            raw = resp.json()
            print(
                f"[KIS 지수 응답] code={kis_code} rt_cd={raw.get('rt_cd')} "
                f"msg={raw.get('msg1')} keys={list(raw.keys())}"
            )
            output = raw.get("output") or {}
            if isinstance(output, list):
                output = output[0] if output else {}
    except Exception as e:
        print(f"[KIS 지수 요청 오류] {e}")
        return None

    value = _to_float(output.get("bstp_nmix_prpr"))
    change_rate = _to_float(output.get("bstp_nmix_prdy_ctrt"))
    if value is None:
        print(f"[KIS 지수 파싱 실패] code={kis_code} output_keys={list(output.keys())}")
        return None
    return {"value": value, "change_rate": change_rate}


async def get_market_indices() -> list[dict]:
    """
    홈 상단 주요 시세 카드용 목록을 반환한다.

    Returns:
        [
            {"code": "kospi", "name": "코스피", "value": 2650.12, "change_rate": 0.85},
            {"code": "kosdaq", "name": "코스닥", "value": 850.33, "change_rate": -0.42},
            {"code": "nasdaq", "name": "나스닥", "value": None, "change_rate": None},
            ...
        ]
    """
    now = datetime.utcnow()
    if (
        _index_cache.get("data")
        and _index_cache.get("expires_at")
        and now < _index_cache["expires_at"]
    ):
        return _index_cache["data"]

    live_slots = [slot for slot in _INDEX_SLOTS if slot["kis_code"]]
    # 코스피·코스닥을 동시에 부르기 전에 토큰을 한 번만 받아 둔다.
    try:
        await get_real_kis_token()
    except Exception as e:
        print(f"[KIS 지수 토큰 오류] {e}")
        live_slots = []
    quotes = await asyncio.gather(
        *[get_index_price(slot["kis_code"]) for slot in live_slots]
    )
    quote_by_code = {
        slot["code"]: quote for slot, quote in zip(live_slots, quotes)
    }

    result = []
    for slot in _INDEX_SLOTS:
        quote = quote_by_code.get(slot["code"])
        result.append({
            "code": slot["code"],
            "name": slot["name"],
            "value": quote["value"] if quote else None,
            "change_rate": quote["change_rate"] if quote else None,
        })

    _index_cache["data"] = result
    _index_cache["expires_at"] = now + timedelta(seconds=15)
    return result
