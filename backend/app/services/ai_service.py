"""
services/ai_service.py - Gemini 투자성향 분석 · 투자 코칭

별도 AI 서버를 띄우지 않고, 백엔드가 무료 Gemini Flash를 직접 호출한다.
코칭에는 KIS 시세 전체를 넣지 않고, 백엔드가 만든 짧은 요약만 보낸다.
"""

import json
from datetime import datetime, timedelta

from google import genai
from google.genai import types

from app.config import settings

# 프론트 설문 문항 번호 → 프롬프트에 넣을 질문 문구
_QUESTION_LABELS = {
    1: "투자 경험",
    2: "자금 성격",
    3: "감당 가능한 손실 범위",
    4: "원금 보존 중요도",
    5: "예상 투자 기간",
    6: "투자 목표",
}

_FALLBACK = {
    "investor_type": "위험중립형",
    "risk_score": 50,
    "summary": "AI 분석에 실패해 기본 성향으로 안내합니다.",
    "advice": "설문을 다시 제출해 주세요.",
    "learning_roadmap": [],
}


def _answers_to_prompt_lines(answers: list[dict]) -> str:
    lines = []
    for item in answers:
        number = item.get("question_number")
        label = _QUESTION_LABELS.get(number, f"문항 {number}")
        selected = item.get("selected_answer", "")
        lines.append(f"{number}. {label}: {selected}")
    return "\n".join(lines) if lines else "응답 없음"


def analyze_survey_answers(answers: list[dict]) -> dict:
    """
    설문 답변을 Gemini에 보내 투자성향을 분석한다.

    Args:
        answers: [{"question_number": 1, "selected_answer": "1년 미만"}, ...]

    Returns:
        investor_type, risk_score, summary, advice, learning_roadmap
    """
    if not settings.GEMINI_API_KEY:
        print("[Gemini] GEMINI_API_KEY가 설정되지 않았습니다.")
        return _FALLBACK

    prompt = f"""
당신은 주식 모의투자 플랫폼의 금융 AI 전문가입니다.
사용자의 설문 응답을 분석하여 최적의 투자 성향 프로필을 도출하세요.

[사용자 설문 응답]
{_answers_to_prompt_lines(answers)}

[출력 규칙]
- investor_type: 반드시 ["안정형", "안정추구형", "위험중립형", "적극투자형", "공격투자형"] 중 하나
- risk_score: 0~100 사이의 정수
- summary: 사용자 성향 요약 (1~2문장)
- advice: 모의투자 실천 조언 (1~2문장)
- learning_roadmap: 단계별 학습 주제 3가지 문자열 배열

반드시 순수 JSON 포맷으로만 응답하세요.
"""

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        data = json.loads(response.text)
        investor_type = data.get("investor_type", _FALLBACK["investor_type"])
        allowed = {"안정형", "안정추구형", "위험중립형", "적극투자형", "공격투자형"}
        if investor_type not in allowed:
            investor_type = _FALLBACK["investor_type"]
        return {
            "investor_type": investor_type,
            "risk_score": int(data.get("risk_score", 50)),
            "summary": str(data.get("summary", "")),
            "advice": str(data.get("advice", "")),
            "learning_roadmap": data.get("learning_roadmap") or [],
        }
    except Exception as e:
        print(f"[Gemini] 분석 오류: {e}")
        return _FALLBACK


_COACH_FALLBACK = {
    "disclaimer": "모의투자 연습용 조언이며 투자 권유가 아닙니다.",
    "observation": "시세 분석을 잠시 사용할 수 없습니다.",
    "advice": "한 종목에 몰아넣지 않고, 수량과 이유를 기록하며 연습해 보세요.",
    "caution": "급등·급락 직후 추격 매수나 패닉 매도는 신중히 보세요.",
}

_coach_cache: dict = {}
_COACH_CACHE_SECONDS = 180


def _call_gemini_json(prompt: str) -> dict | None:
    if not settings.GEMINI_API_KEY:
        print("[Gemini] GEMINI_API_KEY가 설정되지 않았습니다.")
        return None
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        data = json.loads(response.text)
        if isinstance(data, dict):
            return data
    except Exception as e:
        print(f"[Gemini] 호출 오류: {e}")
    return None


def generate_coach_advice(facts: dict, cache_key: str | None = None) -> dict:
    """
    짧은 시세·보유 요약으로 모의투자 조언을 만든다.
    매수·매도 지시가 아니라 관찰·주의 문장만 받는다.
    """
    now = datetime.utcnow()
    if cache_key:
        cached = _coach_cache.get(cache_key)
        if cached and cached.get("expires_at") and now < cached["expires_at"]:
            return cached["data"]

    facts_text = json.dumps(facts, ensure_ascii=False)
    prompt = f"""
당신은 대학생 모의투자 앱의 연습 코치입니다.
아래 숫자만 보고, 직접 매수·매도를 시키지 말고 연습용 조언을 하세요.

[사실]
{facts_text}

[금지]
- 사라, 팔아라, 지금이 바닥/천장이다, 목표가, 수익률 보장
- 사실에 없는 숫자나 뉴스를 만들지 말 것
- 긴 설명

[출력 JSON]
- disclaimer: 모의투자 연습용이며 투자 권유가 아님을 한 문장
- observation: 지금 숫자에서 보이는 점 1~2문장
- advice: 성향을 고려한 연습 조언 1~2문장
- caution: 주의할 점 1문장
"""

    data = _call_gemini_json(prompt)
    result = {
        "disclaimer": str((data or {}).get("disclaimer") or _COACH_FALLBACK["disclaimer"]),
        "observation": str((data or {}).get("observation") or _COACH_FALLBACK["observation"]),
        "advice": str((data or {}).get("advice") or _COACH_FALLBACK["advice"]),
        "caution": str((data or {}).get("caution") or _COACH_FALLBACK["caution"]),
    }
    if cache_key:
        _coach_cache[cache_key] = {
            "data": result,
            "expires_at": now + timedelta(seconds=_COACH_CACHE_SECONDS),
        }
    return result


_news_cache: dict = {}
_NEWS_CACHE_SECONDS = 180
_NEWS_DISCLAIMER = "모의투자 연습용 설명이며 투자 권유가 아닙니다."


def _text_list(value, limit: int) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    lines = []
    for item in value:
        text = str(item).strip()
        if text:
            lines.append(text)
        if len(lines) >= limit:
            break
    return lines


def _price_move(change_rate) -> tuple[str, str]:
    """등락률을 상승·하락·보합·미확인으로 나누고, headline에 그대로 쓸 시작 문장을 만든다."""
    try:
        rate = float(change_rate)
    except (TypeError, ValueError):
        return "unknown", "등락률은 확인되지 않았습니다. headline에 퍼센트를 넣지 마세요."
    if rate > 0:
        return "up", f'headline은 반드시 "오늘은 +{rate:g}% 올랐고,"로 시작한다. 이 퍼센트 외의 등락률은 쓰지 않는다.'
    if rate < 0:
        return "down", f'headline은 반드시 "오늘은 {rate:g}% 내렸고,"로 시작한다. 이 퍼센트 외의 등락률은 쓰지 않는다.'
    return "flat", 'headline은 "오늘은 0%로 보합이고,"로 시작한다.'


def generate_news_brief(
    symbol_code: str,
    name: str,
    articles: list[dict],
    change_rate=None,
) -> dict:
    """
    종목 뉴스와 오늘 등락률을 Gemini에 보내, 등락과 같이 보이는 이슈를 짧게 정리한다.
    같은 종목·같은 방향은 3분 동안 다시 부르지 않는다.
    """
    direction, move_text = _price_move(change_rate)
    cache_key = f"{symbol_code}:{direction}:{change_rate}"
    now = datetime.utcnow()
    cached = _news_cache.get(cache_key)
    if cached and cached.get("expires_at") and now < cached["expires_at"]:
        return cached["data"]

    lines = []
    titles = []
    for article in articles[:5]:
        title = str(article.get("title") or "").strip()
        summary = str(article.get("summary") or "").strip()
        if not title:
            continue
        titles.append(title)
        lines.append(f"- {title}" + (f" ({summary})" if summary else ""))

    prompt = f"""
당신은 대학생 모의투자 앱의 뉴스 요약입니다.
오늘 등락을 말하고, 같은 기사에서 같이 보이는 이슈를 짧게 정리하세요.
그 이슈가 등락의 원인이라고 단정하지 마세요.

[종목]
{name} ({symbol_code})

[오늘 등락]
{move_text}

[기사]
{chr(10).join(lines)}

[정리]
- headline은 위에 적힌 시작 문장을 그대로 쓰고, 이어서 "기사에서 같이 보이는 이슈는 ..."를 붙인다.
- 등락률이 없으면 퍼센트 없이 기사에서 보이는 이슈만 한 줄로 쓴다.
- summary는 그 이슈의 기사 내용 2~3문장이다. 마지막 문장에 이 이슈가 오늘 등락의 원인인지는 기사만으로 확인되지 않는다고 쓴다.
- 기사가 가격 변동의 이유라고 직접 말한 경우에만, 그 문장 대신 기사에 그렇게 나와 있다고 쓴다.

[금지]
- 사라, 팔아라, 목표가, 수익률 보장
- 기사와 위에 적힌 등락률 외에 숫자, 이유, 사건을 만들지 말 것
- headline만 "원인을 확인하기 어렵다"로 끝내지 말 것

[출력 JSON]
- headline: 오늘 등락과 기사 이슈를 함께 적은 한 줄
- summary: 기사 내용 2~3문장. 문자열 배열
- tags: 기사에 나온 주제 단어 1~3개. 문자열 배열
- disclaimer: 모의투자 연습용이며 투자 권유가 아니라는 한 문장
"""
    data = _call_gemini_json(prompt) or {}
    summary = _text_list(data.get("summary"), 3) or titles[:3]
    result = {
        "headline": str(data.get("headline") or "").strip() or "뉴스 요약을 잠시 사용할 수 없습니다.",
        "summary": summary,
        "tags": _text_list(data.get("tags"), 3),
        "disclaimer": str(data.get("disclaimer") or "").strip() or _NEWS_DISCLAIMER,
    }
    _news_cache[cache_key] = {
        "data": result,
        "expires_at": now + timedelta(seconds=_NEWS_CACHE_SECONDS),
    }
    return result
