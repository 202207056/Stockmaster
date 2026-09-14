# gp-mock-inv 백엔드 문서

> 모의투자 + 경제학습 플랫폼 · 백엔드 저장소
> 프론트·팀 공유 문서는 [Stockmaster](https://github.com/202207056/Stockmaster)의 `Doc/`를 본다.
> 문서 정리: 2026-09-11

이 저장소는 FastAPI 백엔드와 종목 시드만 관리한다. 화면 실행·프론트 API 연결 절차는 팀 저장소의 [팀원 연동 실행 가이드](https://github.com/202207056/Stockmaster/blob/main/Doc/팀원_연동_실행가이드.md)를 따른다.

## 공유 문서 목록

| 문서 | 내용 | 읽을 때 |
|---|---|---|
| [백엔드 README](../backend/README.md) | 로컬 실행, 패키지, Alembic | 서버를 띄울 때 |
| [백엔드 구현기록 목록](<./backend 구현기록/README.md>) | 백엔드 작업 기록 목차 | 변경 이력을 찾을 때 |
| [시세·주문·AI 코칭 기록](<./backend 구현기록/2026-09-11_시세_주문_AI코칭.md>) | 거래대금 순위, 지수 API, 주문 체결가, 코칭 | 2026-09-11 이후 백엔드 범위를 확인할 때 |

## 현재 백엔드 상태 (2026-09-11)

배포 주소: `https://gp-mock-inv.onrender.com` · 명세: `https://gp-mock-inv.onrender.com/docs`

| 항목 | 현재 상태 |
|---|---|
| CORS | `allow_origins=["*"]`. 프론트 origin `http://localhost:5173` 허용 |
| 종목 검색·상세·현재가·차트 | 비로그인 조회 가능. 현재가·차트는 KIS 모의투자 키 |
| 종목 순위 | `volume` / `change` / `amount` 분리. 실전투자 키. 키 없거나 외부 실패 시 빈 배열 |
| 주요 시세 | `GET /api/market/indices`. 코스피·코스닥만 값, 나스닥·S&P·금·달러는 `null` |
| 주문 | 요청 JSON 유지. 체결가는 서버가 KIS 현재가로 결정. 수량 `gt=0`, 계좌·보유 행 잠금. 멱등성은 없음 |
| 설문 | `POST /api/ai/survey`에서 저장과 Gemini 분석을 함께 수행 |
| 코칭 | `GET /api/ai/coach`. 짧은 시세·보유 요약만 Gemini에 넣어 조언. 매수·매도 지시 금지 |
| 뉴스 | 비로그인 조회 가능. 요청 시 네이버 금융 크롤링 |
| 커뮤니티 목록 | 로그인 필요 |
| 학습·관심종목 서버 API | 없음. 프론트 로컬 용어집·브라우저 관심종목 사용 |

프론트 `main`이 아직 안 붙인 기능(홈 상단 시세, 주문 전송 플래그, 코칭 화면)과 백엔드 구현 완료는 별개다.

## 저장소 구조

```text
gp-mock-inv/
├── backend/                 FastAPI · Alembic
├── item_master_seed.sql     개발 DB용 대표 종목 시드
└── Doc/
    ├── README.md            이 문서 목차
    └── backend 구현기록/     Git으로 공유하는 백엔드 작업 기록
```

팀 프론트 저장소와 맞출 때는 `Doc/backend 구현기록/`를 Stockmaster의 `Doc/` 아래로 복사하면 된다.

## 문서 관리 기준

- 백엔드 API 경로·요청·응답이 바뀌면 구현기록에 남긴다.
- 검증한 사실과 미검증 항목을 구분한다.
- `.env`, 키, 토큰, 비밀번호는 문서와 Git에 넣지 않는다.
