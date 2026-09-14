"""
config.py - 환경변수 설정 파일

.env 파일에 적어둔 값들(DB 주소, 비밀키 등)을 
파이썬 코드에서 쉽게 불러올 수 있도록 관리하는 파일입니다.

사용 예시:
    from app.config import settings
    print(settings.DATABASE_URL)  # DB 주소 출력
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    프로젝트 전체에서 사용하는 설정값 모음.
    
    BaseSettings를 상속하면 .env 파일을 자동으로 읽어옵니다.
    예를 들어 .env에 DATABASE_URL=postgresql://... 이라고 쓰면
    settings.DATABASE_URL 로 꺼내 쓸 수 있습니다.
    """

    # PostgreSQL 데이터베이스 접속 주소
    # 형식: postgresql://유저명:비밀번호@서버주소:포트/DB이름
    DATABASE_URL: str

    # JWT 토큰을 만들 때 쓰는 비밀 암호키
    # 이 키가 유출되면 누구나 가짜 토큰을 만들 수 있으므로 절대 외부 공유 금지
    SECRET_KEY: str

    # JWT 암호화 방식 (HS256이 표준)
    ALGORITHM: str = "HS256"

    # 로그인 토큰 유효 시간 (분 단위, 기본 60분 = 1시간)
    # 이 시간이 지나면 자동 로그아웃됨
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # 한국투자증권 오픈API — 모의투자 키 (시세·차트 조회용)
    # https://apiportal.koreainvestment.com 에서 발급
    KIS_APP_KEY: str = ""
    KIS_APP_SECRET: str = ""

    # 한국투자증권 오픈API — 실전투자 키 (순위 조회 전용)
    # 순위분석 TR(FHPST0171xxxx 등)은 실전 도메인에서만 제공됨
    # ⚠️ 계좌번호는 저장하지 않음 — 시세·순위 조회에는 불필요하며 유출 리스크를 높임
    KIS_REAL_APP_KEY: str = ""
    KIS_REAL_APP_SECRET: str = ""

    # Gemini API (설문 투자성향 분석)
    # https://aistudio.google.com 에서 발급
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # 예전 별도 AI 서버 주소. 설문은 백엔드에서 Gemini를 직접 호출하므로 사용하지 않음.
    AI_SERVER_URL: str = "http://localhost:8001"

    class Config:
        # 설정값을 읽어올 파일 이름 (.env 파일)
        env_file = ".env"


# settings 객체를 한 번 만들어두고 다른 파일에서 import해서 사용
# 예: from app.config import settings
settings = Settings()
