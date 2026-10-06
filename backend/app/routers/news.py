"""
routers/news.py - 뉴스/이슈 API 엔드포인트

시장 뉴스는 네이버 증권 뉴스 목록, 종목 뉴스는 네이버 금융에서 가져옵니다.

제공하는 API:
    GET /news/market        → 전체 시장 뉴스
    GET /news/{symbol_code} → 특정 종목 뉴스

참고:
    - 응답 속도가 느릴 수 있습니다 (네이버 서버 응답 대기)
    - 실제 서비스에서는 주기적으로 크롤링 후 DB에 저장하는 방식 권장
"""

from fastapi import APIRouter, HTTPException, Query

from app.services.news_service import NewsUnavailable, get_market_news, get_news_by_symbol

# prefix는 main.py에서 /api/news 로 지정
# 최종 경로 예시: /api/news/market, /api/news/005930
router = APIRouter(tags=["뉴스"])


@router.get("/market", summary="전체 시장 뉴스")
async def market_news(
    limit: int = Query(20, ge=1, le=50, description="가져올 뉴스 수"),
):
    """
    주식 시장 전체 뉴스를 반환합니다.
    
    async def 사용 이유:
        크롤링은 네트워크 요청이므로 시간이 걸립니다.
        비동기로 처리하면 기다리는 동안 다른 API 요청도 처리 가능합니다.
    
    응답 예시:
        [
            {
                "title": "코스피, 외국인 매수세에 강세...",
                "url": "https://n.news.naver.com/...",
                "summary": "외국인 순매수에 코스피가 올랐습니다.",
                "source": "연합뉴스",
                "image_url": "https://mimgnews.pstatic.net/image/example.jpg",
                "date": "6분전"
            },
            ...
        ]
    """
    try:
        return await get_market_news(limit)
    except NewsUnavailable as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/{symbol_code}", summary="종목별 뉴스")
async def symbol_news(
    symbol_code: str,   # URL 경로에서 자동으로 추출
    limit: int = Query(10, description="가져올 뉴스 수"),
):
    """
    특정 종목의 뉴스를 반환합니다.
    
    사용 예시:
        GET /news/005930     → 삼성전자 뉴스
        GET /news/000660     → SK하이닉스 뉴스
    
    응답 예시:
        [
            {
                "title": "삼성전자, 실적 발표...",
                "url": "https://n.news.naver.com/...",
                "summary": "반도체 실적 기대가 이어지고 있습니다.",
                "date": "2026.09.27 13:19",
                "source": "조선비즈"
            },
            ...
        ]
    """
    return await get_news_by_symbol(symbol_code, limit)
