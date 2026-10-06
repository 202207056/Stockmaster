"""Read-only KIS best quotes. No broker order/account API calls."""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN
import httpx
from fastapi import HTTPException
from app.config import settings
from app.services.kis_service import KIS_MOCK_URL, get_kis_token, _assert_read_only

BOOK_TYPES = {"중간가", "최유리지정가", "최우선지정가"}
ORDER_TYPES = BOOK_TYPES | {"지정가", "시장가"}


async def get_order_book(symbol_code: str) -> dict:
    if not settings.KIS_APP_KEY:
        raise HTTPException(503, "호가 조회 설정이 없어 주문 가격을 확인할 수 없습니다.")
    tr_id = "FHKST01010200"
    _assert_read_only(tr_id)
    token = await get_kis_token()
    async with httpx.AsyncClient(verify=False, timeout=10) as client:
        response = await client.get(
            f"{KIS_MOCK_URL}/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn",
            headers={"authorization": f"Bearer {token}", "appkey": settings.KIS_APP_KEY,
                     "appsecret": settings.KIS_APP_SECRET, "tr_id": tr_id, "custtype": "P"},
            params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": symbol_code},
        )
        response.raise_for_status()
        payload = response.json()
    if payload.get("rt_cd") != "0":
        raise HTTPException(503, "호가 조회에 실패했습니다. 잠시 후 다시 확인해 주세요.")
    values = payload.get("output1") or {}
    try:
        book = {"bid": int(values.get("bidp1") or 0), "ask": int(values.get("askp1") or 0),
                "bid_quantity": int(values.get("bidp_rsqn1") or 0),
                "ask_quantity": int(values.get("askp_rsqn1") or 0)}
        validate_book(book)
    except (ValueError, TypeError):
        raise HTTPException(503, "유효한 양방향 호가가 없어 주문할 수 없습니다.")
    return book | {"symbol_code": symbol_code, "market": "KRX", "observed_at": datetime.now(timezone.utc).isoformat(),
                   "notice": "조회 시점의 호가입니다. 실제 시장의 체결 순서·호가 소진은 재현하지 않습니다."}


def validate_book(book):
    if not book or not (0 < book["bid"] <= book["ask"]) or min(book["bid_quantity"], book["ask_quantity"]) < 0:
        raise ValueError("유효한 양방향 호가가 필요합니다.")


def resolve_price(price_type, side, book):
    validate_book(book)
    if price_type == "중간가":
        return ((Decimal(str(book["bid"])) + Decimal(str(book["ask"]))) / 2).quantize(Decimal("1"), rounding=ROUND_DOWN)
    if price_type == "최유리지정가":
        return Decimal(str(book["ask"] if side == "매수" else book["bid"]))
    if price_type == "최우선지정가":
        return Decimal(str(book["bid"] if side == "매수" else book["ask"]))
    raise ValueError("지원하지 않는 호가 유형입니다.")


def executable(side, limit, quantity, book):
    """Conservative snapshot simulation: full size at best quote or keep pending."""
    validate_book(book)
    if side == "매수":
        return Decimal(str(book["ask"])) <= limit and quantity <= book["ask_quantity"]
    return Decimal(str(book["bid"])) >= limit and quantity <= book["bid_quantity"]
