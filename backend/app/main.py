"""
main.py - FastAPI 앱의 시작점 (진입점)

이 파일이 서버의 핵심입니다.
uvicorn app.main:app --reload 명령어로 서버를 실행하면
이 파일의 app 객체를 기준으로 서버가 시작됩니다.

API 경로 구조 (팀장 요청 반영):
    /api/users/...    → 회원가입, 로그인, 내 정보
    /api/ai/...       → 설문, 투자성향, AI 코치/추천
    /api/stocks/...   → 종목 검색, 시세, 차트
    /api/trading/...  → 주문, 계좌, 포트폴리오
    /api/news/...     → 뉴스 크롤링
    /api/community/.. → 게시판, 댓글, 좋아요
    /api/ranking/...  → 수익률 랭킹
    /api/market/...   → 주요 시세 (코스피·코스닥)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 각 기능별로 분리된 라우터 파일들을 가져옴
from app.routers import (
    accounts,    # 계좌 관련 API
    ai,          # AI 연동 API
    auth,        # 회원가입/로그인 API
    community,   # 커뮤니티 게시판 API
    market,      # 주요 시세 API
    news,        # 뉴스 크롤링 API
    orders,      # 주문(매수/매도) API
    portfolio,   # 포트폴리오(보유종목) API
    ranking,     # 수익률 랭킹 API
    securities,  # 종목 조회 API
)


# FastAPI 앱 객체 생성
# title, description은 /docs 페이지에 표시됨
app = FastAPI(
    title="GP 모의투자 API",
    description="""
## GP 모의투자 플랫폼 백엔드 API

### 도메인별 경로
| 도메인 | 경로 | 설명 |
|--------|------|------|
| 사용자/인증 | `/api/users` | 회원가입, 로그인, 내 정보 |
| AI/설문 | `/api/ai` | 투자성향 설문, AI 코치, 종목추천 |
| 주식 시세 | `/api/stocks` | 종목 검색, 현재가, 차트 |
| 거래 | `/api/trading` | 매수/매도, 계좌, 포트폴리오 |
| 뉴스 | `/api/news` | 종목별/시장 뉴스 |
| 커뮤니티 | `/api/community` | 게시판, 댓글, 좋아요 |
| 랭킹 | `/api/ranking` | 수익률 랭킹 |
| 시장 시세 | `/api/market` | 코스피·코스닥 등 주요 시세 |

### 인증 방법
1. `POST /api/users/login` 으로 로그인
2. 응답의 `access_token` 복사
3. 우측 상단 **Authorize** 버튼 클릭 후 토큰 입력
    """,
    version="1.0.0",
)


# CORS (Cross-Origin Resource Sharing) 설정
# -----------------------------------------------
# CORS란? 브라우저 보안 정책으로, 다른 주소에서 오는 요청을 기본적으로 막음
# 예: React(localhost:3000)가 FastAPI(localhost:8000)에 요청할 때 막힘
# 아래 설정으로 React 프론트가 백엔드에 요청할 수 있도록 허용해줍니다
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # 모든 주소 허용 (개발 중에는 편의상 전체 허용)
    allow_credentials=True,
    allow_methods=["*"],          # GET, POST, PUT, DELETE 등 모든 메서드 허용
    allow_headers=["*"],          # Authorization 헤더 포함 모든 헤더 허용
)


# 라우터 등록
# -----------------------------------------------
# prefix를 붙여서 팀장이 요청한 경로 구조로 맞춥니다.
#
# prefix란?
#   라우터에 공통으로 붙는 앞부분 경로입니다.
#   예: prefix="/api/users" + 라우터 내부 "/login" = 최종 경로 "/api/users/login"
#
# tags란?
#   /docs 페이지에서 API를 그룹으로 묶어서 보여주는 라벨입니다.

# 사용자/인증: 회원가입, 로그인, 내 정보, 투자성향 저장
app.include_router(auth.router, prefix="/api/users", tags=["사용자/인증"])

# AI/설문: 투자성향 설문 제출, 결과 조회, AI 코치, 종목추천
app.include_router(ai.router, prefix="/api/ai", tags=["AI/설문"])

# 주식 시세: 종목 검색, 현재가(KIS API), 차트 데이터
# /api/stocks, /api/stocks/{code}/price, /api/stocks/{code}/chart
app.include_router(securities.router, prefix="/api/stocks", tags=["주식 시세"])

# 거래 - 주문: 매수/매도 주문, 주문내역 조회
# /api/trading/orders
app.include_router(orders.router, prefix="/api/trading/orders", tags=["거래"])

# 거래 - 계좌: 계좌 목록, 잔고 조회, 계좌 개설
# /api/trading/accounts
app.include_router(accounts.router, prefix="/api/trading/accounts", tags=["거래"])

# 거래 - 포트폴리오: 보유 종목, 수익률 조회
# /api/trading/portfolio
app.include_router(portfolio.router, prefix="/api/trading/portfolio", tags=["거래"])

# 뉴스: 종목별 뉴스, 시장 전체 뉴스 크롤링
app.include_router(news.router, prefix="/api/news", tags=["뉴스"])

# 커뮤니티: 게시판, 댓글, 좋아요, 팔로우
app.include_router(community.router, prefix="/api/community", tags=["커뮤니티"])

# 랭킹: 수익률 기준 사용자 랭킹
app.include_router(ranking.router, prefix="/api/ranking", tags=["랭킹"])

# 시장 시세: 홈 상단 코스피·코스닥
# /api/market/indices
app.include_router(market.router, prefix="/api/market", tags=["시장 시세"])


# 서버 상태 확인용 기본 API
# http://localhost:8000/ 접속시 응답
@app.get("/", tags=["상태확인"])
def root():
    """서버가 정상 실행 중인지 확인하는 API."""
    return {"status": "ok", "message": "GP 모의투자 API 서버가 실행 중입니다."}
