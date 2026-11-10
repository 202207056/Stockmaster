# Stockmaster 실행 가이드

Windows PowerShell 기준입니다. Git과 Node.js 24 계열/npm을 준비합니다.

## 1. 코드 받기

처음 실행한다면 작업할 폴더에서 저장소를 받습니다.

```powershell
git clone https://github.com/202207056/Stockmaster.git
cd Stockmaster
```

이미 저장소가 있다면 `Stockmaster` 폴더에서 로컬 변경 사항을 확인·보존한 뒤 업데이트합니다.

```powershell
git status --short
git pull --ff-only
```

## 2. 의존성 설치

저장소 루트에서 실행합니다.

```powershell
cd frontend
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

기존 `.env`는 덮어쓰지 않습니다.

## 3. API 연결 설정

`frontend/.env`에 연결할 백엔드 주소를 설정합니다. 팀 배포 백엔드를 사용하면 별도의 DB나 API 키 없이 프론트를 실행할 수 있습니다.

```dotenv
VITE_API_BASE_URL=https://gp-mock-inv.onrender.com/api
VITE_ENABLE_ORDER_SUBMISSION=true
```

- API 주소 끝에 `/api`를 포함합니다. 환경변수가 없을 때도 팀 배포 백엔드로 연결합니다.
- 모의 주문 전송을 끄려면 `VITE_ENABLE_ORDER_SUBMISSION=false`로 설정합니다.
- `.env.local`에 같은 변수가 있으면 `.env`보다 우선하므로 함께 확인합니다.
- `VITE_` 변수는 브라우저에 공개되므로 DB 비밀번호나 API 비밀키를 넣지 않습니다.

## 4. 개발 서버 실행

`frontend` 폴더에서 실행합니다.

```powershell
npm.cmd run dev
```

터미널에 표시되는 `Local` 주소로 접속합니다. 기본 주소는 `http://localhost:5173`이며, 포트 사용 여부에 따라 달라질 수 있습니다.

- 최초 실행 시 OCR 언어 모델을 다운로드하므로 인터넷 연결이 필요합니다.
- `/signup`에서 가입하거나 `/login`에서 선택한 백엔드의 계정으로 로그인합니다. 가입·주문·게시글 등은 해당 서버의 DB에 저장됩니다.
- 종료는 `Ctrl+C`입니다. 환경변수를 수정했다면 개발 서버를 재시작합니다.

## 5. 로컬 백엔드 연결 (선택)

[백엔드 저장소](https://github.com/202207048/gp-mock-inv)를 받고, [상세 실행 가이드의 방법 B](./Doc/팀원_연동_실행가이드.md#8-방법-b--백엔드와-db까지-로컬-실행)에 따라 Python 의존성, PostgreSQL, 환경변수, 마이그레이션과 종목 시드를 준비합니다.

백엔드 저장소의 `backend` 폴더에서 실행합니다.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`http://localhost:8000/docs`에서 실행을 확인한 뒤 `frontend/.env`의 주소를 변경하고 프론트 개발 서버를 재시작합니다.

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

기존 서버에서 로그아웃한 뒤 로컬 DB의 계정으로 가입·로그인합니다.

### 종목 분석 서버

개발 모드의 종목 분석·재무정보·투자의견 요청은 API 주소 설정과 별개로 `127.0.0.1:8011`에 전달됩니다. 해당 화면을 사용하려면 백엔드 의존성과 환경설정을 준비한 후, 별도 터미널의 `gp-mock-inv/backend` 폴더에서 실행합니다.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.market_data_preview:app --host 127.0.0.1 --port 8011
```

## 6. 빌드 및 미리보기

`frontend` 폴더에서 실행합니다.

```powershell
npm.cmd run build
npm.cmd run preview
```

빌드 결과는 `frontend/dist`에 생성됩니다. 미리보기 주소는 터미널에서 확인합니다. 운영 빌드에는 `.env.production`도 적용되므로 API 주소와 주문 설정을 확인합니다.

## 실행이 안 될 때

- **API 연결 실패:** `.env`와 `.env.local`의 주소, 백엔드 실행 상태를 확인합니다. 배포 서버 API 명세는 `https://gp-mock-inv.onrender.com/docs`입니다.
- **종목 분석 요청 실패:** 로컬 8011 포트의 종목 분석 서버가 실행 중인지 확인합니다.
- **로그인 오류:** 연결한 백엔드의 계정인지 확인하고 다시 로그인합니다.
- **요청 오류 확인:** 브라우저 `F12` → `Network` → `Fetch/XHR`에서 요청 URL·상태 코드·응답을 확인합니다.

DB 준비와 자세한 연결 점검 절차는 [팀원 API 연동 실행 가이드](./Doc/팀원_연동_실행가이드.md)를 참고하세요.
