from fastapi import APIRouter, Path
from pydantic import BaseModel

from app.services.stock_logo_service import get_stock_logo

router = APIRouter()


class StockLogoResponse(BaseModel):
    symbol_code: str
    logo_url: str | None


@router.get("/{symbol_code}/logo", response_model=StockLogoResponse, summary="종목 로고 조회 (네이버)")
async def stock_logo(symbol_code: str = Path(pattern=r"^[0-9A-Z]{6}$")):
    """Returns a Naver stock or ETF logo URL; unavailable logos return null."""
    return {"symbol_code": symbol_code, "logo_url": await get_stock_logo(symbol_code)}
