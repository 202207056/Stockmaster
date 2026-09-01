# GP 모의투자 플랫폼 (Frontend)

AI를 활용한 맞춤형 모의투자 및 투자 학습 웹 플랫폼의 프론트엔드입니다.

> 현재 상태와 판단 근거는 **[`Doc/15_프론트엔드_F1-F10_작업기록.md`](../Doc/15_프론트엔드_F1-F10_작업기록.md)**,
> 앞으로 할 일은 **[`Doc/13_프론트엔드_단독진행_가이드.md`](../Doc/13_프론트엔드_단독진행_가이드.md)** 를 보세요.

---

## 🛠 기술 스택

| 구분 | 사용 |
|---|---|
| Library | React 19 |
| Build | Vite 8 |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) — CDN 방식 아님 |
| Routing | React Router DOM v7 |
| HTTP | Axios |
| Backend | Python FastAPI (별도 저장소) |

---

## 🚀 시작하기

```bash
npm install

# 환경변수 준비 — .env 는 커밋되지 않습니다
cp .env.example .env
# .env 를 열어 VITE_API_BASE_URL 을 실제 주소로 바꾸세요

npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드
npm run lint     # 커밋 전 필수
```

### 환경변수

| 이름 | 예시 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://gp-mock-inv.onrender.com/api` | **끝에 `/api` 포함, 슬래시로 끝내지 않음** |

> 🔴 이 값을 설정하지 않으면 `http://localhost:8000/api` 로 폴백합니다.
> 배포 시 플랫폼의 환경변수 설정에 반드시 넣으세요.

---

## 🔓 지금은 로그인 없이 모든 화면이 열립니다

```js
// src/config/features.js
export const REQUIRE_AUTH = false;
```

아직 백엔드를 붙이지 않아 로그인 자체가 불가능하고, 붙인 뒤에도 "로그인 없이 둘러보기"를
지원할 계획이라 접근 제어를 꺼 두었습니다.

- 라우트는 **그대로 `<ProtectedRoute>` 로 감싸져 있습니다.** 보호가 필요해지면
  위 값 하나만 `true` 로 바꾸면 되고, 다른 파일은 손대지 않아도 됩니다.
- 비로그인 상태에서는 `user` / `account` 가 `null` 입니다. 개인 데이터 자리에는
  **`<LoginNotice />`** 를 넣어 "로그인하면 표시돼요"를 보여 주세요. 빈칸이나
  무한 스켈레톤을 남기면 고장난 화면처럼 보입니다.

| 로그인 없이 완전히 동작 | 로그인 필요 |
|---|---|
| 용어사전 · 관심종목 · 투자성향 설문 | 예수금 · 주문가능금액 · 보유종목 · 내 정보 |

> 이것은 화면 접근 제어일 뿐 **보안 장치가 아닙니다.** 데이터 보호는 서버의 토큰 검사로만 이뤄집니다.

---

## 📁 폴더 구조

```text
src/
 ├── config/
 │    └── features.js     🔓 REQUIRE_AUTH 등 기능 플래그
 ├── api/
 │    ├── client.js      ★ axios 인스턴스 — env baseURL · 토큰 · 401 · 콜드스타트
 │    ├── auth.js          인증/계좌 API 래퍼
 │    └── axios.js         @deprecated — client.js 재수출 (기존 import 보호용)
 ├── contexts/
 │    ├── auth-context.js  createContext
 │    └── AuthContext.jsx  AuthProvider (로그인 상태 · 계좌 보관)
 ├── hooks/useAuth.js
 ├── components/
 │    ├── layout/          Layout · Header · Nav · Footer
 │    ├── common/          Skeleton · EmptyState · ErrorState · Modal · Spinner · LoginNotice
 │    ├── learn/           HelpIcon ★ 용어 도움말
 │    ├── routing/         ProtectedRoute (현재 통과 모드)
 │    └── system/          ApiStatusBanner (서버 기동 안내)
 ├── constants/
 │    ├── glossary.js     ★ 투자 용어 66개
 │    ├── survey.js        투자성향 문항·배점
 │    ├── nav.js           메뉴 항목
 │    └── emptyMessages.js 빈 상태 문구 프리셋
 ├── utils/
 │    ├── format.js        금액·수익률 포맷 (문자열/숫자 혼재 방어)
 │    ├── favorites.js     관심종목 (localStorage 임시 구현)
 │    └── tickSize.js      호가 단위 · 주문가 검증
 └── pages/                화면 단위 컴포넌트
```

---

## 🧭 화면(라우트)

| 경로 | 화면 | 비로그인 상태 |
|---|---|---|
| `/` | Landing | 전체 |
| `/login` `/signup` | 로그인 · 회원가입 | 전체 |
| `/learn` | **투자 용어사전** | **완전 동작** |
| `/dashboard` | 대시보드 | 열림 (금액은 안내로 대체) |
| `/trading` | 트레이딩 | 열림 |
| `/assets` | 내 자산 | 열림 (금액은 안내로 대체) |
| `/favorites` | 관심종목 | **완전 동작** (localStorage) |
| `/community` | 커뮤니티 | 열림 |
| `/survey` | 투자성향 설문 | **완전 동작** (결과 localStorage) |
| `/mypage` | 내 정보 | 로그인 안내만 표시 |
| 그 외 | 404 | 전체 |

---

## ✅ 코드 규칙

### 1. 금액은 반드시 `num()` 을 거친다

API마다 금액 타입이 다릅니다. `/trading/accounts` 의 `balance` 는 **문자열**, `/trading/portfolio` 는 숫자입니다.

```js
import { num, won, rate, rateWithMark, signTextClass } from '../utils/format';

won(account.balance);          // "10,000,000원"  ← 문자열이 와도 안전
<span className={signTextClass(r)}>{rateWithMark(r)}</span>   // "▲ 1.50%"
```

### 2. 상승은 빨강, 하락은 파랑 — 기호를 함께 쓴다

한국 증시 관례입니다. 색상만으로 구분하면 색약 사용자가 읽을 수 없으므로 `▲▼` 를 함께 표기합니다.
디자인 토큰: `text-up-600` / `text-down-600` / `text-flat-500`.

### 3. 상태 4종을 모두 처리한다

```jsx
if (loading) return <SkeletonList rows={5} />;
if (error)   return <ErrorState error={error} onRetry={reload} />;
if (!isAuthenticated) return <LoginNotice message="로그인하면 보유종목이 표시돼요" />;
if (!items.length) return <EmptyState {...EMPTY_MESSAGES.holdings} />;
```

빈 배열은 오류가 아니라 정상 응답인 경우가 많습니다(뉴스 크롤링 실패, 종목 30개 한정).
오류 문구는 `error.userMessage` 에 이미 담겨 있습니다 (FastAPI 의 `detail` 을 꺼내 둠).

### 4. 어려운 용어 옆에는 `HelpIcon` 을 붙인다 ★

발표에서 약속한 핵심 기능입니다. 현재 66개 용어가 등록되어 있습니다.

```jsx
<label>지정가 <HelpIcon termId="limit_order" /></label>
```

용어를 추가하려면 `src/constants/glossary.js` 에 한 항목만 넣으면 됩니다.

### 5. API 호출은 `api/client.js` 를 쓴다

토큰 첨부·401 자동 로그아웃·콜드스타트 안내가 모두 여기 붙어 있습니다.
`api/axios.js` 는 하위호환용이므로 새 코드에서는 쓰지 마세요.

### 6. 커밋 전에 `npm run lint`

`react-hooks` / `react-refresh` 규칙이 켜져 있습니다. 특히 **한 파일에서 컴포넌트와 상수를 함께 export 하지 마세요** (Fast Refresh가 깨집니다).

---

## 🤝 협업 규칙

- 담당 화면의 `pages/` 파일에서 주로 작업하고, 공통 컴포넌트를 고칠 때는 팀에 알립니다.
- 별도 CSS 파일 대신 Tailwind 클래스를 씁니다. 색은 토큰(`brand` / `up` / `down` / `flat`)을 쓰세요.
- `.env` 는 절대 커밋하지 않습니다. 값이 바뀌면 `.env.example` 만 갱신합니다.

## 📌 남은 작업 (F-11 ~ F-20)

코드 곳곳에 `TODO(F-1x)` 주석으로 위치를 표시해 두었습니다.

```bash
grep -rn "TODO(F-" src/
```
