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

from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.security import ItemMaster
from app.schemas.security import SecurityResponse
from app.services.kis_service import (
    get_current_price,
    get_listed_stock,
    get_stock_chart,
    get_stock_ranking,
    search_listed_stocks,
)
from app.services.chart_history import ChartUnavailable, get_chart_history
from app.services.market_details import get_market_details
from app.routers.stock_logos import router as stock_logos_router

# prefix는 main.py에서 /api/stocks 로 지정
router = APIRouter(tags=["주식 시세"])
router.include_router(stock_logos_router)


@router.get('/{symbol_code}/orderbook', summary='매수·매도 10단계 호가 조회')
async def get_market_orderbook(symbol_code: str):
    return await get_market_details(symbol_code, 'orderbook')


@router.get('/{symbol_code}/trades', summary='최근 시장 체결 조회')
async def get_market_trades(symbol_code: str):
    return await get_market_details(symbol_code, 'trades')


@router.get("", response_model=list[SecurityResponse], summary="종목 목록 조회")
async def get_securities(
    market_type: str | None = Query(None, description="국내주식, ELW, 선물옵션"),
    search: str | None = Query(None, description="종목명 또는 코드 검색"),
    db: Session = Depends(get_db),
):
    """
    종목 목록을 조회합니다.

    검색어가 없으면 DB에 넣어 둔 종목만 최대 100개 반환한다.
    검색어가 있으면 DB 결과 뒤에, 네이버 종목 검색의 국내 주식을 코드가 겹치지 않게 붙인다.

    검색 예시:
        GET /stocks?search=삼성          → DB와 네이버에서 "삼성"이 포함된 종목
        GET /stocks?market_type=국내주식  → 국내주식만
        GET /stocks?search=005930        → 종목 코드로 검색
    """
    query = db.query(ItemMaster)

    if market_type:
        query = query.filter(ItemMaster.market_type == market_type)

    keyword = (search or "").strip()
    if keyword:
        query = query.filter(
            ItemMaster.name.ilike(f"%{keyword}%") |
            ItemMaster.symbol_code.ilike(f"%{keyword}%")
        )

    rows = query.limit(100).all()
    if not keyword or market_type not in (None, "국내주식"):
        return rows

    seen = {row.symbol_code for row in rows}
    result = list(rows)
    for item in await search_listed_stocks(keyword, 100):
        if item["symbol_code"] in seen:
            continue
        result.append(item)
        seen.add(item["symbol_code"])
        if len(result) >= 100:
            break
    return result


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
async def get_security(
    symbol_code: str,
    db: Session = Depends(get_db),
):
    """
    특정 종목의 기본 정보를 반환합니다. (종목명, 시장구분, 업종코드)
    DB에 없으면 한국투자증권 현재가의 한글 종목명을 사용합니다.
    실시간 가격은 /price 엔드포인트를 사용하세요.
    """
    security = db.query(ItemMaster).filter(ItemMaster.symbol_code == symbol_code).first()
    if security:
        return security
    listed = await get_listed_stock(symbol_code)
    if not listed:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다.")
    return listed


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
    range: Literal["D", "W", "M", "Y"] | None = Query(
        None, description="상세 차트: D(1일), W(1주), M(3개월), Y(1년). 지정 시 period보다 우선"
    ),
):
    """
    차트 데이터(캔들스틱)를 반환합니다.

    range를 지정하면 분봉·기간 조회 결과(rows, range, resolution, notice)를 반환합니다.
    생략하면 기존 period 기준의 가격 배열을 그대로 반환합니다.

    응답 예시:
        [
            {"date": "20240115", "open": 74000, "high": 76000,
             "low": 73500, "close": 75000, "volume": 15000000},
            ...
        ]
    """
    if range is not None:
        if len(symbol_code) != 6 or any(char not in "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" for char in symbol_code):
            raise HTTPException(status_code=422, detail="종목코드는 6자리 영문 대문자 또는 숫자여야 합니다.")
        try:
            return await get_chart_history(symbol_code, range)
        except ChartUnavailable as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        except (httpx.HTTPError, ValueError, KeyError) as error:
            raise HTTPException(status_code=502, detail="KIS 차트 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.") from error
    return await get_stock_chart(symbol_code, period)
