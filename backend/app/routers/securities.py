"""
routers/securities.py - 종목 관련 API 엔드포인트

제공하는 API:
    GET /stocks                        → 종목 목록/검색
    GET /stocks/ranking/{type}         → 종목 순위 (거래량·급등·거래대금)
    GET /stocks/{code}                 → 종목 상세 정보
    GET /stocks/{code}/price           → 현재가 조회 (KIS 모의 API)
    GET /stocks/{code}/chart           → 차트 데이터 조회

⚠️ 시세·검색·순위·차트는 비로그인 조회를 허용한다. 주문·계좌는 해당 없음.
⚠️ /ranking/{rank_type} 은 반드시 /{symbol_code} 보다 먼저 등록해야 한다.
FastAPI는 경로를 위에서부터 순서대로 매칭하므로, 순서가 바뀌면
"ranking"이 symbol_code 값으로 처리된다.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.security import ItemMaster
from app.schemas.security import SecurityResponse
from app.services.kis_service import get_current_price, get_stock_chart, get_stock_ranking

# prefix는 main.py에서 /api/stocks 로 지정
router = APIRouter(tags=["주식 시세"])


@router.get("", response_model=list[SecurityResponse], summary="종목 목록 조회")
def get_securities(
    market_type: str | None = Query(None, description="국내주식, ELW, 선물옵션"),
    search: str | None = Query(None, description="종목명 또는 코드 검색"),
    db: Session = Depends(get_db),
):
    """
    종목 목록을 조회합니다.

    검색 예시:
        GET /stocks?search=삼성          → "삼성"이 포함된 모든 종목
        GET /stocks?market_type=국내주식  → 국내주식만
        GET /stocks?search=005930        → 종목 코드로 검색
    """
    query = db.query(ItemMaster)

    if market_type:
        query = query.filter(ItemMaster.market_type == market_type)

    if search:
        query = query.filter(
            ItemMaster.name.ilike(f"%{search}%") |
            ItemMaster.symbol_code.ilike(f"%{search}%")
        )

    return query.limit(100).all()


# ⚠️ 반드시 /{symbol_code} 보다 먼저 등록
@router.get("/ranking/{rank_type}", summary="종목 순위 조회 (실전 KIS API)")
async def get_ranking(
    rank_type: str,
    limit: int = Query(10, ge=1, le=30, description="반환할 종목 수"),
):
    """
    종목 순위를 조회합니다. 실전 KIS API를 사용합니다.

    rank_type:
        - volume  → 거래량 상위
        - change  → 급등 상위 (상승률 기준)
        - amount  → 거래대금 상위

    응답 예시:
        [
            {
                "rank": 1,
                "symbol_code": "005930",
                "name": "삼성전자",
                "price": 75000,
                "change_rate": 1.5,
                "volume": 15000000,
                "amount": 1125000000000
            }
        ]

    KIS_REAL_APP_KEY 가 설정되지 않았거나 장 마감 시간이면 빈 배열이 반환됩니다.
    """
    if rank_type not in ("volume", "change", "amount"):
        raise HTTPException(
            status_code=400,
            detail="rank_type은 volume, change, amount 중 하나여야 합니다.",
        )
    return await get_stock_ranking(rank_type, limit)


@router.get("/{symbol_code}", response_model=SecurityResponse, summary="종목 상세 조회")
def get_security(
    symbol_code: str,
    db: Session = Depends(get_db),
):
    """
    특정 종목의 기본 정보를 반환합니다. (종목명, 시장구분, 업종코드)
    실시간 가격은 /price 엔드포인트를 사용하세요.
    """
    security = db.query(ItemMaster).filter(ItemMaster.symbol_code == symbol_code).first()
    if not security:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다.")
    return security


@router.get("/{symbol_code}/price", summary="현재가 조회 (KIS API)")
async def get_price(
    symbol_code: str,
):
    """
    한국투자증권 모의투자 API를 통해 실시간 현재가를 조회합니다.

    응답 예시:
        {
            "symbol_code": "005930",
            "current_price": 75000,
            "change_rate": 1.5,
            "high": 76000,
            "low": 74500,
            "volume": 15000000
        }
    """
    return await get_current_price(symbol_code)


@router.get("/{symbol_code}/chart", summary="차트 데이터 조회")
async def get_chart(
    symbol_code: str,
    period: str = Query("D", description="D(일봉), W(주봉), M(월봉)"),
):
    """
    차트 데이터(캔들스틱)를 반환합니다.

    응답 예시:
        [
            {"date": "20240115", "open": 74000, "high": 76000,
             "low": 73500, "close": 75000, "volume": 15000000},
            ...
        ]
    """
    return await get_stock_chart(symbol_code, period)
