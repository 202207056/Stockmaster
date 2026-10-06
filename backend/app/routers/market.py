"""
routers/market.py - 시장 시세 API

제공하는 API:
    GET /market/indices → 홈 상단 주요 시세

비로그인 조회를 허용한다.
코스피·코스닥은 실전 KIS, 나스닥·S&P 500·국내 금·원/달러는 네이버 시세다.
코스피·코스닥은 당일 10분 포인트가 있으면 intraday 도 함께 내려간다.
조회에 실패한 카드만 value 가 null 이다.
"""

from fastapi import APIRouter

from app.services.kis_service import get_market_indices

# prefix는 main.py에서 /api/market 으로 지정
# 최종 경로: GET /api/market/indices
router = APIRouter(tags=["시장 시세"])


@router.get("/indices", summary="주요 시세 조회")
async def get_indices():
    """
    홈 상단 카드용 주요 시세를 반환합니다.

    응답 예시:
        [
            {"code": "kospi", "name": "코스피", "value": 2650.12, "change_rate": 0.85,
             "intraday": {"date": "20260923", "points": [
                 {"time": "090000", "value": 2640.1},
                 {"time": "091000", "value": 2648.5}
             ]}},
            {"code": "kosdaq", "name": "코스닥", "value": 850.33, "change_rate": -0.42},
            {"code": "nasdaq", "name": "나스닥", "value": 27068.72, "change_rate": 0.48},
            {"code": "sp500", "name": "S&P 500", "value": 7743.41, "change_rate": 0.51},
            {"code": "gold", "name": "금", "value": 189500, "change_rate": 0.20},
            {"code": "usd", "name": "달러", "value": 1359, "change_rate": 0.26}
        ]

    코스피·코스닥은 실전 KIS API, 나머지 네 카드는 네이버 시세 JSON입니다.
    금은 국내 금(원/g)입니다. 키가 없거나 조회에 실패하면 해당 항목의 value 는 null 입니다.
    """
    return await get_market_indices()
