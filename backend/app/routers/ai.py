"""
routers/ai.py - AI 및 투자성향 설문 API 엔드포인트

제공하는 API:
    [백엔드가 Gemini를 직접 호출]
    POST /api/ai/survey             → 설문 저장 후 Gemini 투자성향 분석
    GET  /api/ai/propensity         → 내 투자성향 분석 결과 조회
    GET  /api/ai/coach              → 시세 요약 기반 모의투자 조언

    [AI 서버 연동 - AI팀 서버가 필요]
    GET  /api/ai/recommend          → AI 종목 추천
    GET  /api/ai/pattern            → 매매 패턴 분석
    GET  /api/ai/news-summary/{code}→ 종목 뉴스 AI 요약
"""

from datetime import datetime
import asyncio
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.account import Account
from app.models.ai_propensity_advice import AiPropensityAdvice
from app.models.portfolio import Portfolio
from app.models.security import ItemMaster
from app.models.user import User
from app.models.user_survey_response import UserSurveyResponse
from app.services.ai_service import analyze_survey_answers, generate_coach_advice
from app.services.kis_service import get_current_price
from app.utils.deps import get_current_user

# prefix는 main.py에서 /api/ai 로 지정
router = APIRouter(tags=["AI/설문"])


# -----------------------------------------------
# Pydantic 스키마 (요청/응답 데이터 형식 정의)
# Pydantic이란? 데이터 유효성 검사 라이브러리
# 프론트에서 잘못된 데이터가 오면 자동으로 에러 반환
# -----------------------------------------------

class SurveyAnswerItem(BaseModel):
    """설문 문항 하나의 데이터 형식."""
    # 설문 문항 번호 (1번: 나이, 2번: 투자 목적 등)
    question_number: int
    # 사용자가 선택한 답변 내용
    selected_answer: str


class SurveySubmitRequest(BaseModel):
    """
    설문 제출 요청 형식.

    프론트에서 이 형식으로 보내야 합니다:
    POST /api/ai/survey
    {
        "answers": [
            {"question_number": 1, "selected_answer": "30대"},
            {"question_number": 2, "selected_answer": "시세차익"},
            ...
        ]
    }
    """
    answers: list[SurveyAnswerItem]


class SurveyResponse(BaseModel):
    """설문 답변 하나의 응답 형식."""
    response_id: int
    question_number: int
    selected_answer: str
    updated_at: datetime

    class Config:
        from_attributes = True  # SQLAlchemy 모델 → Pydantic 자동 변환


class PropensityAdviceResponse(BaseModel):
    """투자성향 분석 결과 응답 형식."""
    advice_id: int
    ai_analysis_result: str | None   # AI 분석 결과 (예: "공격투자형")
    ai_detailed_advice: str | None   # AI 상세 조언
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------------------------------------
# 설문 API (DB 직접 연동 - AI팀 서버 불필요)
# -----------------------------------------------

@router.post("/survey", summary="투자성향 설문 저장 및 Gemini 분석")
async def submit_survey(
    req: SurveySubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    설문 답변을 저장한 뒤 Gemini로 투자성향을 분석합니다.

    기존 답변이 있으면 덮어씁니다 (재설문 가능).
    분석 결과는 users.investment_style 과 ai_propensity_advice 에 저장됩니다.
    """
    db.query(UserSurveyResponse).filter(
        UserSurveyResponse.user_id == current_user.user_id
    ).delete()

    saved = []
    payload = []
    for answer in req.answers:
        response = UserSurveyResponse(
            user_id=current_user.user_id,
            question_number=answer.question_number,
            selected_answer=answer.selected_answer,
            updated_at=datetime.utcnow(),
        )
        db.add(response)
        saved.append(response)
        payload.append({
            "question_number": answer.question_number,
            "selected_answer": answer.selected_answer,
        })

    analysis = await asyncio.to_thread(analyze_survey_answers, payload)

    current_user.investment_style = analysis["investor_type"]
    advice = AiPropensityAdvice(
        user_id=current_user.user_id,
        ai_analysis_result=analysis["investor_type"],
        ai_detailed_advice=json.dumps(analysis, ensure_ascii=False),
        created_at=datetime.utcnow(),
    )
    db.add(advice)
    db.commit()

    return {
        "message": f"설문 답변 {len(saved)}개가 저장되었고 투자성향이 분석되었습니다.",
        "user_id": current_user.user_id,
        "answer_count": len(saved),
        "investment_style": analysis["investor_type"],
        "analysis": analysis,
    }


@router.get("/survey", summary="내 설문 답변 조회", response_model=list[SurveyResponse])
def get_my_survey(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    내가 제출한 투자성향 설문 답변을 조회합니다.

    설문을 아직 안 했으면 빈 목록이 반환됩니다.
    """
    return db.query(UserSurveyResponse).filter(
        UserSurveyResponse.user_id == current_user.user_id
    ).order_by(UserSurveyResponse.question_number).all()


@router.get("/propensity", summary="내 투자성향 분석 결과 조회")
def get_my_propensity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    AI가 분석한 내 투자성향 결과를 조회합니다.

    AI팀이 분석 결과를 ai_propensity_advice 테이블에 저장하면
    이 API로 프론트에서 조회할 수 있습니다.

    아직 분석 결과가 없으면 null을 반환합니다.

    응답 예시:
        {
            "advice_id": 1,
            "ai_analysis_result": "공격투자형",
            "ai_detailed_advice": "변동성이 높은 종목도 과감하게...",
            "created_at": "2024-01-15T10:30:00"
        }
    """
    # 가장 최신 분석 결과를 반환 (재설문하면 새 결과가 생길 수 있음)
    advice = (
        db.query(AiPropensityAdvice)
        .filter(AiPropensityAdvice.user_id == current_user.user_id)
        .order_by(AiPropensityAdvice.created_at.desc())
        .first()
    )

    if not advice:
        return {
            "message": "아직 투자성향 분석 결과가 없습니다. 설문을 먼저 완료하세요.",
            "result": None,
        }

    parsed = None
    if advice.ai_detailed_advice:
        try:
            parsed = json.loads(advice.ai_detailed_advice)
        except (json.JSONDecodeError, TypeError):
            parsed = None

    return {
        "advice_id": advice.advice_id,
        "ai_analysis_result": advice.ai_analysis_result,
        "ai_detailed_advice": advice.ai_detailed_advice,
        "analysis": parsed,
        "created_at": advice.created_at,
    }


# -----------------------------------------------
# AI 서버 연동 API (AI팀 서버가 있어야 동작)
# -----------------------------------------------

async def _call_ai(path: str, payload: dict | None = None) -> dict:
    """
    AI 서버를 호출하는 공통 함수.

    AI팀이 별도로 운영하는 서버(기본: localhost:8001)에 요청을 보냅니다.
    AI 서버 주소는 .env의 AI_SERVER_URL에서 설정합니다.

    Args:
        path: AI 서버의 엔드포인트 경로 (예: "/recommend")
        payload: 보낼 데이터. None이면 GET, 있으면 POST 요청

    Raises:
        HTTPException 503: AI 서버가 꺼져있거나 연결 불가
    """
    try:
        # timeout=30: AI 처리는 오래 걸릴 수 있으므로 30초 대기
        async with httpx.AsyncClient(timeout=30) as client:
            if payload:
                resp = await client.post(f"{settings.AI_SERVER_URL}{path}", json=payload)
            else:
                resp = await client.get(f"{settings.AI_SERVER_URL}{path}")

            resp.raise_for_status()
            return resp.json()

    except httpx.ConnectError:
        # AI 서버가 꺼져있는 경우
        raise HTTPException(
            status_code=503,
            detail="AI 서버에 연결할 수 없습니다. AI팀 서버가 실행 중인지 확인하세요.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="AI 서버 오류")


@router.get("/coach", summary="AI 투자 코칭 (Gemini)")
async def ai_coach(
    symbol: str = Query("005930", description="종목 코드 (예: 005930 삼성전자)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    현재가·보유 요약만 Gemini에 보내 모의투자 조언을 반환합니다.
    매수·매도 지시가 아니라 관찰과 주의 문장입니다.

    Swagger 사용:
        1. 로그인 후 Authorize
        2. symbol 기본값 005930 그대로 Execute

    응답 예시:
        {
            "facts": {
                "symbol_code": "005930",
                "name": "삼성전자",
                "current_price": 75000,
                "change_rate": 1.2,
                "investment_style": "안정추구형",
                "holding": {"quantity": 10, "avg_price": 72000, "return_rate": 4.17}
            },
            "disclaimer": "모의투자 연습용 조언이며 투자 권유가 아닙니다.",
            "observation": "오늘 변동이 크지 않습니다.",
            "advice": "성향이 안정 쪽이면 수량을 나눠 연습해 보세요.",
            "caution": "급등 직후 추격 매수는 신중히 보세요."
        }
    """
    symbol_code = (symbol or "").strip()
    if not symbol_code:
        raise HTTPException(status_code=400, detail="종목 코드를 입력해 주세요.")

    quote = {}
    try:
        quote = await get_current_price(symbol_code)
    except Exception as e:
        print(f"[coach] 현재가 조회 실패: {e}")

    item = db.query(ItemMaster).filter(ItemMaster.symbol_code == symbol_code).first()
    account = (
        db.query(Account)
        .filter(Account.user_id == current_user.user_id)
        .order_by(Account.account_id.asc())
        .first()
    )
    holding_row = None
    if account:
        holding_row = (
            db.query(Portfolio)
            .filter(
                Portfolio.account_id == account.account_id,
                Portfolio.symbol_code == symbol_code,
            )
            .first()
        )

    current_price = quote.get("current_price") or 0
    holding = None
    if holding_row:
        avg_price = float(holding_row.avg_price or 0)
        return_rate = None
        if avg_price > 0 and current_price:
            return_rate = round((float(current_price) - avg_price) / avg_price * 100, 2)
        holding = {
            "quantity": holding_row.hold_quantity,
            "avg_price": avg_price,
            "return_rate": return_rate,
        }

    facts = {
        "symbol_code": symbol_code,
        "name": item.name if item else symbol_code,
        "current_price": current_price or None,
        "change_rate": quote.get("change_rate"),
        "high": quote.get("high") or None,
        "low": quote.get("low") or None,
        "investment_style": current_user.investment_style or "미설정",
        "holding": holding,
    }

    coaching = await asyncio.to_thread(
        generate_coach_advice,
        facts,
        f"{current_user.user_id}:{symbol_code}",
    )
    return {"facts": facts, **coaching}


@router.get("/recommend", summary="AI 종목 추천 (AI팀 서버 필요)")
async def ai_recommend(current_user: User = Depends(get_current_user)):
    """
    유저의 투자성향을 바탕으로 AI가 종목을 추천합니다.

    AI팀 서버의 /recommend 엔드포인트를 호출합니다.
    AI팀 서버가 없으면 503 오류가 반환됩니다.

    응답 예시 (AI팀과 협의 필요):
        {
            "recommendations": [
                {"symbol_code": "005930", "reason": "반도체 업황 개선"},
                {"symbol_code": "000660", "reason": "AI 수요 증가"}
            ]
        }
    """
    return await _call_ai(
        "/recommend",
        {
            "user_id": current_user.user_id,
            "investment_style": current_user.investment_style,
        },
    )


@router.get("/pattern", summary="매매 패턴 분석 (AI팀 서버 필요)")
async def ai_pattern(current_user: User = Depends(get_current_user)):
    """
    유저의 매매 패턴을 AI가 분석합니다.

    예시: "고점 추격 매수 패턴", "패닉셀 경향" 등
    """
    return await _call_ai("/pattern", {"user_id": current_user.user_id})


@router.get("/news-summary/{symbol_code}", summary="종목 뉴스 AI 요약 (AI팀 서버 필요)")
async def ai_news_summary(
    symbol_code: str,
    _: User = Depends(get_current_user),
):
    """
    특정 종목의 최신 뉴스를 AI가 요약해서 반환합니다.

    사용 예시:
        GET /api/ai/news-summary/005930  → 삼성전자 뉴스 AI 요약

    응답 예시:
        {
            "summary": "삼성전자는 3분기 반도체 수요 증가로...",
            "sentiment": "긍정"
        }
    """
    return await _call_ai(f"/news-summary/{symbol_code}")
