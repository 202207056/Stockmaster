"""
routers/market.py - 시장 시세 API

제공하는 API:
    GET /market/indices → 홈 상단 주요 시세 (코스피·코스닥)

비로그인 조회를 허용한다. 나스닥·S&P·금·달러는 아직 값이 없어 null 로 내려간다.
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
            {"code": "kospi", "name": "코스피", "value": 2650.12, "change_rate": 0.85},
            {"code": "kosdaq", "name": "코스닥", "value": 850.33, "change_rate": -0.42},
            {"code": "nasdaq", "name": "나스닥", "value": null, "change_rate": null},
            {"code": "sp500", "name": "S&P 500", "value": null, "change_rate": null},
            {"code": "gold", "name": "금", "value": null, "change_rate": null},
            {"code": "usd", "name": "달러", "value": null, "change_rate": null}
        ]

    코스피·코스닥만 실전 KIS API에서 가져옵니다.
    키가 없거나 조회에 실패하면 해당 항목의 value 는 null 입니다.
    """
    return await get_market_indices()
