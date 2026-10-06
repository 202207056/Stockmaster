# GP 모의투자 백엔드

## 예약·조건 모의 주문 (2026-10-06)

`alembic upgrade head`로 `d20261006_automations`를 적용한 뒤 서버를 재시작합니다. 새 테이블이 없으면 기존 API는 유지되고 예약·조건 감시는 시작하지 않습니다.

- `ENABLE_ORDER_AUTOMATIONS=true`(기본값)와 유효한 KIS 시세 키가 필요합니다. API 서버 시작 시 30초 간격의 서버 감시가 시작됩니다. 휴면 서버에서는 실행되지 않습니다.
- `GET /api/trading/automations/capabilities`: 감시 준비 여부와 마지막 실행 주기. 조회·등록·취소는 로그인 필요.
- `POST /api/trading/automations`: `scheduled` 예약 또는 `condition` 가격 이상/이하, 최대 30일·활성 20개/계좌. `client_request_id` UUID로 등록 재시도 중복 방지.
- `GET /api/trading/automations?account_id=...`: 활성 우선 최대 200개 내역.
- `PUT /api/trading/automations/{automation_id}/cancel`: 실행 전 취소.
- 평일 09:00~15:20 KST에 최근 2분 이내 당일 분봉 체결 시세로 1회 시장가 모의 체결합니다. 거래량 없는/오래된 시세, 장외, 통신 장애에서는 보류합니다. 잔고 부족은 거부로 종료합니다.
- 등록 시 현금과 수량을 예약하지 않습니다. 실행 때 수수료·세금을 적용하고 주문 생성·계좌 변경·감시 종료를 같은 트랜잭션으로 저장합니다. 기존 지정가 대기의 자동 체결 기능은 별개로 제공하지 않습니다.
- 감시 중지 설정은 등록 내역을 삭제하지 않습니다. 재시작 시 유효한 작업이 다시 실행 대상이 되므로 종료할 작업은 API로 취소합니다.

상세 공식 자료 분석·UI·API 계약·제한은 동반 프론트 저장소 `Stockmaster/Doc/2026-10-06_예약_조건주문_분석_및_설계.md`에 있습니다. 운영 DB/주문 호출 없이 테스트하려면 `python -m unittest discover -s tests -v`를 실행합니다. PostgreSQL 다중 워커의 실제 잠금 경합은 배포 전 별도 개발 DB에서 확인해야 합니다.

## 시작하기 (처음 세팅)

### 1. Python 가상환경 생성 및 활성화
```bash
# backend 폴더 안에서 실행
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 2. 패키지 설치
```bash
pip install -r requirements.txt
```

### 3. 환경변수 설정
```bash
# .env.example을 복사해서 .env 파일 생성 후 값 입력
copy .env.example .env
```
`.env` 파일을 열어서 `DATABASE_URL`에 실제 PostgreSQL 접속 정보를 입력하세요.

### 4. DB 테이블 생성 (Alembic 마이그레이션)
```bash
# 마이그레이션 파일 생성
alembic revision --autogenerate -m "init"

# DB에 테이블 적용
alembic upgrade head
```

### 5. 서버 실행
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

서버 실행 후 브라우저에서 확인:
- API 문서 (Swagger): http://localhost:8000/docs
- 상태 확인: http://localhost:8000/

---

## API 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /auth/register | 회원가입 |
| POST | /auth/login | 로그인 (JWT 토큰 발급) |
| GET | /auth/me | 내 정보 조회 |
| PUT | /auth/survey | 투자 성향 저장 |
| GET | /accounts | 내 계좌 목록 |
| POST | /accounts | 계좌 개설 |
| GET | /securities | 종목 목록/검색 |
| GET | /securities/{code}/price | 현재가 조회 |
| GET | /securities/{code}/chart | 차트 데이터 |
| POST | /orders | 매수/매도 주문 |
| GET | /orders | 주문 내역 |
| GET | /portfolio | 보유 종목 조회 |
| GET | /news/market | 전체 시장 뉴스 |
| GET | /news/{code} | 종목별 뉴스 |
| GET | /community/posts | 게시글 목록 |
| POST | /community/posts | 게시글 작성 |
| POST | /community/posts/{id}/like | 좋아요 |
| POST | /community/posts/{id}/comments | 댓글 작성 |
| GET | /ranking | 수익률 랭킹 |
| GET | /ai/recommend | AI 종목 추천 |
| GET | /ai/coach | AI 투자 코칭 |

---

## 팀 협업

- **프론트팀**: `http://localhost:8000/docs` 에서 API 명세 확인 가능
- **DB팀**: 스키마 변경 시 `alembic revision --autogenerate -m "변경내용"` 후 공유
- **AI팀**: `.env`의 `AI_SERVER_URL`에 AI 서버 주소 입력
