# Stockmaster 프론트엔드

React · Vite · Tailwind 기반 모의투자·학습 화면입니다. 상세 환경설정은 [팀원 연동 실행 가이드](../Doc/팀원_연동_실행가이드.md)를 참고하세요.

## 처음 실행하기 — Windows PowerShell

Node.js 24 계열과 npm을 준비한 뒤, 저장소 루트에서 실행합니다.

```powershell
cd frontend
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run dev
```

터미널에 표시된 주소로 접속합니다. 기본 주소는 `http://localhost:5173`이며, 포트가 사용 중이면 달라질 수 있습니다.

`.env.example`의 기본값은 팀 배포 서버입니다. 프론트만 실행해도 연결되며 DB·KIS 키는 필요 없습니다. **가입·설문·게시글 저장은 배포 서버의 DB에 반영됩니다.** 기존 `.env`는 위 명령으로 덮어쓰지 않으므로 API 주소를 별도로 확인하세요.

```dotenv
VITE_API_BASE_URL=https://gp-mock-inv.onrender.com/api
VITE_ENABLE_ORDER_SUBMISSION=false
```

로컬 백엔드에 연결하려면 URL을 `http://localhost:8000/api`로 바꾸고 Vite를 재시작합니다. 환경변수가 없을 때도 로컬 백엔드 주소를 사용합니다.

## 현재 사용 범위

- 로그인 전: 서비스 소개·용어집·브라우저 관심종목 목록.
- 로그인 후: 종목 검색·시세·차트·뉴스·게시글·자산·주문내역·설문. 실제 결과는 백엔드 상태와 제공 데이터에 따라 달라집니다.
- 주문 전송: 백엔드 정합성 검증 전까지 기본 비활성화. 검증된 테스트 환경에서만 기능 플래그를 변경합니다.
- 관심종목: 사용자별 브라우저 저장이며 기기 간 서버 동기화는 없습니다.

## 검증 명령

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

자동 테스트는 로컬 응답 어댑터를 사용하며 실제 서버에 회원가입·주문·게시글을 만들지 않습니다. 실서버 로그인과 CORS 검증은 별도로 해야 합니다.

## 개발 시 기준

- 요청은 `src/api/client.js`와 `src/api/data.js` 등 API 모듈을 사용합니다.
- `useRemote`로 조회 취소·로딩·오류·재시도를 처리합니다. 응답 실패를 목업으로 대체하지 않습니다.
- 금액 누락과 0원을 구분합니다. 평가 계산에는 `numberOrNull`, `quotePrice`, `portfolioTotals`를 사용합니다.
- `.env`, DB 접속 비밀번호, JWT 서명키, KIS 키를 Git에 올리지 않습니다. `VITE_` 변수는 브라우저에 공개됩니다.
- 공통 스타일은 Tailwind 토큰을 사용하고 투자 용어에는 `HelpIcon`을 활용합니다.

[프론트 구현기록](<../Doc/frontend 구현기록/README.md>) · [프론트 작업·백엔드 요청사항](../Doc/13_프론트엔드_실행계획_및_백엔드_요청사항.md)
