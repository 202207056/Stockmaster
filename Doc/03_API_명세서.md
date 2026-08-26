# 03. 백엔드 API 명세서

> 🔒 = 인증 필요 · 작성일 2026-08-25 · 개정 2026-08-25

## ⚠️ 실제 구현과의 차이 (반드시 먼저 읽을 것)

이 문서는 `/api/v1/...` 규약으로 작성되었으나, **이미 구현·배포된 백엔드는 다른 경로를 사용합니다.**

| 이 문서 | 실제 구현 (정본) |
|---|---|
| `/api/v1/auth/login` | `/api/users/login` |
| `/api/v1/users/me` | `/api/users/me` |
| `/api/v1/stocks/{s}/quote` | `/api/stocks/{s}/price` |
| `/api/v1/trading/orders` | `/api/trading/orders` |
| `/api/v1/portfolio/summary` | `/api/trading/portfolio?account_id=` |
| `/api/v1/ai/survey/submit` | `/api/ai/survey` |
| `/api/v1/community/posts` | `/api/community/posts` |

**결정: 이미 동작하는 실제 구현 경로를 정본으로 채택하세요.**
문서 때문에 배포된 코드를 바꾸는 것은 낭비입니다.
아래 명세는 **"앞으로 추가할 엔드포인트와 응답 필드의 목표 형태"**로 읽으시고,
경로는 실제 Swagger(https://gp-mock-inv.onrender.com/docs)를 기준으로 삼으세요.

미구현 상태로 남아 있는 주요 항목: 호가 조회, 지수, 랭킹(거래대금/급등락), 관심종목,
학습(`/learn/*`), 알림, 자산 요약(`/portfolio/summary`), 체결내역(`/trades`).

---

> Base URL(문서 기준): `/api/v1` · 인증: `Authorization: Bearer <access_token>`

이 문서는 **프론트–백엔드 계약서**입니다. 프론트는 이 명세만 보고 화면을 만들고,
백엔드는 이 명세만 지키면 됩니다. 변경 시 반드시 이 문서를 먼저 고치세요.

---

## 0. 공통 규약

### 에러 응답 (전 엔드포인트 공통)
```json
{
  "error": {
    "code": "INSUFFICIENT_CASH",
    "message": "주문가능금액이 부족합니다.",
    "detail": "필요 3,270,000원 / 가능 1,500,000원",
    "help_concept_id": "cash_and_margin"
  }
}
```

| HTTP | 상황 |
|---|---|
| 400 | 요청 형식 오류 |
| 401 | 미인증 / 토큰 만료 (`TOKEN_EXPIRED`) |
| 403 | 권한 없음 |
| 404 | 자원 없음 |
| 409 | 중복 (아이디/닉네임/이메일) |
| 422 | 비즈니스 규칙 위반 (예수금 부족, 장 마감, 호가단위 오류 등) |
| 429 | 요청 과다 |
| 502 | 외부 API(KIS/LLM) 실패 |

### 주요 에러 코드
`DUPLICATE_LOGIN_ID` · `INVALID_CREDENTIALS` · `TOKEN_EXPIRED` · `MARKET_CLOSED` ·
`INSUFFICIENT_CASH` · `INSUFFICIENT_QUANTITY` · `INVALID_TICK_SIZE` · `PRICE_OUT_OF_LIMIT` ·
`ORDER_NOT_CANCELABLE` · `STOCK_NOT_TRADABLE` · `KIS_UNAVAILABLE` · `AI_QUOTA_EXCEEDED`

### 목록 응답
```json
{ "items": [...], "total": 128, "page": 1, "size": 20 }
```

---

## 1. 인증 · 사용자 (`/auth`, `/users`)

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| POST | `/auth/signup` | 회원가입 (가입 시 모의계좌 자동 생성) | |
| POST | `/auth/login` | 로그인 → access/refresh 발급 | |
| POST | `/auth/refresh` | 액세스 토큰 재발급 | |
| POST | `/auth/logout` | 리프레시 토큰 무효화 | 🔒 |
| GET | `/auth/check-id?login_id=` | 아이디 중복 확인 | |
| GET | `/users/me` | 내 프로필 | 🔒 |
| PATCH | `/users/me` | 프로필 수정 (닉네임, 이미지) | 🔒 |
| PATCH | `/users/me/password` | 비밀번호 변경 | 🔒 |

**POST `/auth/signup`**
```jsonc
// Request
{ "login_id": "user01", "password": "P@ssw0rd!", "user_name": "이시영",
  "nickname": "투자꿈나무", "email": "a@b.com" }
// 201 Response
{ "user_id": 1, "login_id": "user01", "nickname": "투자꿈나무",
  "account": { "account_id": 1, "account_no": "9001-0000001", "cash": 10000000 } }
```

**POST `/auth/login`**
```jsonc
// Request  { "login_id": "user01", "password": "P@ssw0rd!" }
// 200 Response
{ "access_token": "eyJ...", "token_type": "bearer", "expires_in": 1800,
  "user": { "user_id": 1, "nickname": "투자꿈나무",
            "investment_style": "STABLE_SEEKING", "has_survey": true } }
// refresh_token은 httpOnly 쿠키로 Set-Cookie
```
> `has_survey: false`면 프론트는 로그인 후 `/survey`로 유도 (온보딩 플로우).

---

## 2. 종목 · 시세 (`/stocks`) — KIS API 사용 영역

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| GET | `/stocks/search?q=삼성&limit=10` | 종목 검색 (코드/명 부분일치) | |
| GET | `/stocks/{symbol}` | 종목 기본정보 + 현재가 | |
| GET | `/stocks/{symbol}/quote` | 현재가만 (폴링용, 경량) | |
| GET | `/stocks/{symbol}/candles?tf=D&count=120` | 봉 데이터 (차트) | |
| GET | `/stocks/{symbol}/orderbook` | 호가 10단계 | |
| GET | `/stocks/rankings?type=amount&limit=10` | 랭킹 (`amount`/`gainers`/`losers`/`volume`) | |
| GET | `/market/indices` | 코스피·코스닥 지수 | |
| GET | `/market/status` | 장 운영 상태 (`OPEN`/`CLOSED`/`PRE`/`AFTER`) | |

**GET `/stocks/005930/quote`**
```jsonc
{
  "symbol_code": "005930", "name": "삼성전자",
  "price": 327000, "prev_close": 295700,
  "change": 31300, "change_rate": 10.58,
  "open": 300000, "high": 330000, "low": 299000,
  "volume": 28451233, "trade_amount": 9128300000000,
  "upper_limit": 384400, "lower_limit": 207000,
  "market_status": "OPEN",
  "fetched_at": "2026-09-01T10:23:11+09:00",
  "is_delayed": false      // 캐시 TTL로 인한 지연 여부 표시
}
```

**GET `/stocks/005930/candles?tf=D&count=120`**
```jsonc
{ "symbol_code": "005930", "time_frame": "D",
  "candles": [ { "ts":"2026-08-25T00:00:00+09:00", "open":295000, "high":301000,
                 "low":294000, "close":299500, "volume":12345678 }, ... ] }
```
> `tf` 허용값: `1M,5M,15M,30M,60M,D,W,MO`

**GET `/stocks/rankings?type=gainers`**
```jsonc
{ "type":"gainers", "updated_at":"2026-09-01T10:23:00+09:00",
  "items":[ {"rank":1,"symbol_code":"000660","name":"SK하이닉스",
             "price":2236000,"change_rate":17.0,"is_favorite":true}, ... ] }
```
> `is_favorite`는 로그인 시에만 채움 → 대시보드 ♡ 아이콘 상태를 한 번에 렌더 가능.

---

## 3. 모의투자 거래 (`/trading`) — 100% 자체 구현 영역

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| POST | `/trading/orders` | 주문 접수 (매수/매도) | 🔒 |
| GET | `/trading/orders?status=&symbol=&page=` | 주문 내역 | 🔒 |
| GET | `/trading/orders/{order_id}` | 주문 상세 (체결 목록 포함) | 🔒 |
| DELETE | `/trading/orders/{order_id}` | 주문 취소 | 🔒 |
| PATCH | `/trading/orders/{order_id}` | 주문 정정 (가격/수량) | 🔒 |
| GET | `/trading/trades?from=&to=&page=` | 체결 내역 | 🔒 |
| GET | `/trading/orderable?symbol=&side=&price=` | 주문가능 수량/금액 조회 | 🔒 |

**POST `/trading/orders`**
```jsonc
// Request
{ "symbol_code": "005930", "side": "BUY",
  "order_kind": "LIMIT",     // LIMIT | MARKET
  "price": 327000,           // MARKET이면 생략
  "quantity": 10 }

// 201 Response (즉시 체결된 경우)
{ "order_id": 1024, "status": "FILLED",
  "symbol_code": "005930", "name": "삼성전자", "side": "BUY",
  "order_kind": "LIMIT", "price": 327000, "quantity": 10,
  "filled_quantity": 10, "filled_avg_price": 326800,
  "fee": 490, "tax": 0, "settled_amount": -3268490,
  "created_at": "2026-09-01T10:24:00+09:00",
  "message": "10주가 326,800원에 체결되었습니다." }

// 422 Response
{ "error": { "code": "INSUFFICIENT_CASH",
             "message": "주문가능금액이 부족합니다.",
             "detail": "필요 3,270,490원 / 가능 1,500,000원",
             "help_concept_id": "cash_and_margin" } }
```

**GET `/trading/orderable?symbol=005930&side=BUY&price=327000`**
```jsonc
{ "orderable_cash": 8500000, "max_quantity": 25,
  "estimated_fee": 1275, "estimated_tax": 0,
  "tick_size": 1000,          // 이 가격대의 호가 단위
  "upper_limit": 384400, "lower_limit": 207000 }
```
> 프론트 주문 폼은 이 응답만으로 "최대 몇 주" 버튼과 유효성 검사를 전부 처리할 수 있습니다.

---

## 4. 자산 · 포트폴리오 (`/portfolio`)

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| GET | `/portfolio/summary` | 자산 요약 (Assets 페이지 상단) | 🔒 |
| GET | `/portfolio/holdings` | 보유 종목 목록 (평가손익 포함) | 🔒 |
| GET | `/portfolio/history?period=1M` | 일별 자산 추이 (그래프) | 🔒 |
| GET | `/portfolio/allocation` | 종목/섹터 비중 (도넛 차트) | 🔒 |
| POST | `/portfolio/reset` | 계좌 초기화 (확인 절차 필요) | 🔒 |

**GET `/portfolio/summary`**
```jsonc
{
  "total_asset": 12616925,      // 현금 + 평가금액
  "cash": 8500000,
  "orderable_cash": 8000000,    // cash - locked_cash
  "stock_value": 4116925,
  "seed_cash": 10000000,
  "total_pnl": 2616925,
  "total_pnl_rate": 26.17,
  "daily_pnl": 132000,
  "daily_pnl_rate": 1.06,
  "realized_pnl": 450000,
  "unrealized_pnl": 2166925,
  "max_drawdown": -8.34,        // ★ 발표자료 "리스크 관리" 대응
  "updated_at": "2026-09-01T10:25:00+09:00"
}
```

**GET `/portfolio/holdings`**
```jsonc
{ "items": [
  { "symbol_code":"005930", "name":"삼성전자",
    "hold_quantity":10, "orderable_quantity":10,
    "avg_price":300000, "current_price":327000,
    "buy_amount":3000000, "eval_amount":3270000,
    "eval_pnl":270000, "eval_pnl_rate":9.0,
    "weight":25.9 } ] }
```

---

## 5. 관심종목 (`/favorites`)

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| GET | `/favorites` | 관심종목 목록 (현재가 포함) | 🔒 |
| POST | `/favorites` | 추가 `{ "symbol_code":"005930" }` | 🔒 |
| DELETE | `/favorites/{symbol_code}` | 삭제 | 🔒 |
| PATCH | `/favorites/order` | 정렬 순서 변경 | 🔒 |

---

## 6. AI (`/ai`)

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| GET | `/ai/survey/questions` | 설문 문항+선택지 조회 | |
| POST | `/ai/survey/submit` | 설문 제출 → 성향 분석 실행 | 🔒 |
| GET | `/ai/propensity` | 최신 성향 분석 결과 | 🔒 |
| GET | `/ai/propensity/history` | 재설문 이력 | 🔒 |
| POST | `/ai/coach/report` | 투자 코치 리포트 생성 (기간 지정) | 🔒 |
| GET | `/ai/coach/reports` | 리포트 목록 | 🔒 |
| GET | `/ai/news?symbol=&limit=` | AI 뉴스 요약 목록 | |
| GET | `/ai/news/{news_id}` | 뉴스 상세 요약 | |
| GET | `/ai/news/daily-report` | 오늘의 AI 뉴스 리포트 (대시보드 버튼) | |

**GET `/ai/survey/questions`** — 현재 `Survey.jsx`의 하드코딩을 대체
```jsonc
{ "questions": [
  { "question_id":1, "question_number":1, "content":"투자 경험이 있나요?",
    "options":[ {"option_id":1,"option_number":1,"content":"전혀 없습니다"},
                {"option_id":2,"option_number":2,"content":"1년 미만"}, ... ] } ] }
```

**POST `/ai/survey/submit`**
```jsonc
// Request
{ "answers": [ {"question_id":1,"option_id":2}, ... ] }
// 200 Response
{ "advice_id": 7, "risk_score": 38, "style_code": "STABLE_SEEKING",
  "ai_analysis_result": "안정추구형",
  "ai_detailed_advice": "원금 보존을 중시하는 성향입니다. ...",
  "recommended_concepts": ["diversification","stop_loss"] }
```
> ⚠️ LLM 호출이 5~15초 걸릴 수 있으므로 프론트에 **로딩 UI 필수**.
> 15초 초과 시 규칙기반 점수 결과로 폴백하고 `"is_fallback": true`를 내려주세요.

**GET `/ai/news?symbol=005930`**
```jsonc
{ "items": [
  { "news_id":12, "title":"'반도체 호조'에 1분기 경제성장률 1.8%",
    "press":"노컷뉴스", "article_url":"https://...",
    "summary_keyword":"반도체 수출 호조로 성장률 상향",
    "sentiment":"POSITIVE", "sentiment_score":0.72,
    "published_at":"2026-09-01T08:10:00+09:00" } ] }
```

---

## 7. 학습 (`/learn`) ★ 신규 도메인

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| GET | `/learn/concepts?level=&category=` | 개념 목록 | |
| GET | `/learn/concepts/{concept_id}` | 개념 상세 (본문 + 퀴즈) | |
| POST | `/learn/concepts/{concept_id}/complete` | 학습 완료 처리 | 🔒 |
| POST | `/learn/quizzes/{quiz_id}/submit` | 퀴즈 채점 | 🔒 |
| GET | `/learn/progress` | 내 학습 진도 | 🔒 |
| GET | `/learn/triggers` | **손실 기반 학습 추천 카드** | 🔒 |
| POST | `/learn/triggers/{id}/dismiss` | 추천 카드 닫기 | 🔒 |
| GET | `/learn/glossary/{term_id}` | 용어 뜻 (도움말 아이콘 ⓘ) | |
| GET | `/learn/glossary?q=` | 용어 검색 | |

**GET `/learn/triggers`** — 이 프로젝트의 차별화 기능
```jsonc
{ "items": [
  { "trigger_id": 31, "reason": "REALIZED_LOSS",
    "symbol_code":"035420", "symbol_name":"NAVER",
    "metric_value": -12.4,
    "message": "NAVER 매도에서 -12.4% 손실이 발생했어요. 손절 원칙을 함께 살펴볼까요?",
    "concept": { "concept_id":"stop_loss", "title":"손절매란?", "est_minutes": 3 },
    "created_at":"2026-09-01T13:02:00+09:00" } ] }
```

**GET `/learn/glossary/per`** — 화면 어디서든 ⓘ 클릭 시
```jsonc
{ "term_id":"per", "term":"PER",
  "short_desc":"주가를 주당순이익으로 나눈 값으로, 이익 대비 주가가 비싼지 판단하는 지표예요.",
  "example":"PER 10배 = 지금 이익이 유지되면 10년 만에 투자금을 번다는 뜻",
  "concept_id":"valuation_basic" }
```

---

## 8. 커뮤니티 (`/community`) ★ 신규 도메인

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| GET | `/community/posts?board=&symbol=&sort=&page=` | 게시글 목록 | |
| GET | `/community/posts/{post_id}` | 게시글 상세 | |
| POST | `/community/posts` | 작성 | 🔒 |
| PATCH | `/community/posts/{post_id}` | 수정 (작성자만) | 🔒 |
| DELETE | `/community/posts/{post_id}` | 삭제 (soft) | 🔒 |
| POST | `/community/posts/{post_id}/like` | 좋아요 토글 | 🔒 |
| GET | `/community/posts/{post_id}/comments` | 댓글 목록 | |
| POST | `/community/posts/{post_id}/comments` | 댓글 작성 | 🔒 |
| DELETE | `/community/comments/{comment_id}` | 댓글 삭제 | 🔒 |
| POST | `/community/users/{user_id}/follow` | 팔로우 토글 | 🔒 |
| GET | `/community/users/{user_id}` | 유저 공개 프로필(+수익률 공개 설정 시) | |

---

## 9. 알림 (`/notifications`)

| Method | Path | 설명 | 인증 |
|---|---|---|:--:|
| GET | `/notifications?unread=true` | 목록 | 🔒 |
| PATCH | `/notifications/{id}/read` | 읽음 처리 | 🔒 |
| PATCH | `/notifications/read-all` | 전체 읽음 | 🔒 |

---

## 10. 시스템

| Method | Path | 설명 |
|---|---|---|
| GET | `/health` | 헬스체크 (DB/Redis/KIS 상태 포함) |
| GET | `/docs` | Swagger UI (FastAPI 자동 생성) |

---

## 11. 구현 현황 및 우선순위 (개정)

### ✅ 이미 구현된 엔드포인트 (27개)

```text
/api/users/register  /login  /me  /survey
/api/ai/survey(POST·GET)  /propensity  /recommend  /coach  /pattern  /news-summary/{code}
/api/stocks  /{code}  /{code}/price  /{code}/chart
/api/trading/orders(POST·GET)  /orders/{id}/cancel
/api/trading/accounts(GET·POST)  /accounts/{id}
/api/trading/portfolio
/api/news/market  /{code}
/api/community/posts(GET·POST)  /posts/{id}  /posts/{id}/comments  /posts/{id}/like
/api/ranking
/  (헬스체크)
```
> 실제 스펙은 https://gp-mock-inv.onrender.com/docs 에서 확인하세요.

### 🔴 이미 있으나 고쳐야 하는 것 (최우선)

| 엔드포인트 | 문제 | 문서 |
|---|---|---|
| `POST /api/trading/orders` | 클라이언트 가격 신뢰 · 음수 수량 · 잠금 없음 | `05` C-1,C-2,C-4 |
| `GET /api/ranking` | `balance` 계산 오류로 순위가 거꾸로 | `05` C-3 |
| `GET /api/trading/portfolio` | `total_value`가 평가금액이 아닌 매입금액 | `05` §4-3 |
| `GET /api/ai/propensity` | 결과를 생성하는 주체가 없어 항상 null | `10_AI_및_학습시스템_설계.md` §4-3 |
| `GET /api/ai/recommend` | 종목 추천 — 성격 변경 또는 삭제 권고 | `10_AI_및_학습시스템_설계.md` §2 |
| `GET /api/stocks` | 로그인 필수 → 비로그인 둘러보기 불가 | `02_시스템_아키텍처.md` §6 |
| `GET /api/news/*` | 크롤링 직접 호출 → DB 조회로 전환 | `10_AI_및_학습시스템_설계.md` §5 |

### 🟠 신규로 만들어야 하는 것

| 우선 | 엔드포인트 | 이유 |
|:--:|---|---|
| P0 | `GET /api/trading/portfolio/summary` | 총자산·수익률·MDD (자산 화면의 핵심) |
| P0 | `GET /api/trading/trades` | 체결 내역 (실현손익) |
| P1 | `GET/POST/DELETE /api/favorites` | `Favorites.jsx`가 붙을 곳 |
| P1 | `GET /api/learn/glossary/{term_id}` | **도움말 아이콘 ★** |
| P1 | `GET /api/learn/triggers` | **손실 → 학습 추천 ★** |
| P1 | `GET /api/stocks/rankings`, `/market/indices` | 대시보드 상단·랭킹 섹션 |
| P2 | `GET /api/learn/concepts/*`, `/progress`, 퀴즈 | 학습 시스템 |
| P2 | `GET /api/trading/portfolio/history` | 수익률 추이 그래프 |
| P2 | `GET /api/stocks/{code}/orderbook` | 호가창 |
| P3 | `POST /api/ai/coach/report`, `/notifications` | 여유 시 |

> **"고쳐야 하는 것" 7개가 "새로 만드는 것"보다 먼저입니다.**
> 특히 상단 4개는 지금 시연하면 바로 지적당하는 항목입니다.
