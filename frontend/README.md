#  GP 모의투자 플랫폼 (Frontend)

AI를 활용한 맞춤형 모의투자 및 투자 학습 웹 플랫폼의 프론트엔드 레포지토리입니다.

## 🛠 사용 기술 (Tech Stack)

**Frontend**
*   **Library:** React 18
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Routing:** React Router DOM
*   **HTTP Client:** Axios

**Backend (API)**
*   Python FastAPI

---

## 📁 폴더 구조 (Directory Structure)

팀원 간의 원활한 협업과 코드 충돌 방지를 위해 도메인 및 기능별로 폴더를 분리하여 작업합니다.

```text
src/
 ├── api/           # Axios 기본 설정 및 API 호출 함수 (토큰 자동 포함)
 ├── pages/         # 화면 단위 컴포넌트 (라우터에 연결될 페이지)
 │    ├── Landing.jsx    # 시작 페이지
 │    ├── Dashboard.jsx  # 메인 대시보드
 │    ├── Login.jsx      # 사용자 인증
 │    ├── Trading.jsx    # 주식 거래
 │    └── ...
 ├── components/    # 버튼, 모달 등 재사용 가능한 공통 UI 컴포넌트
 └── assets/        # 이미지, 폰트 등 정적 리소스


 🚀 시작 가이드 (Getting Started)
팀원들은 아래의 순서대로 로컬 개발 환경을 세팅해 주세요.

1. 프로젝트 클론 (다운로드)

Bash
git clone [이곳에 깃허브 레포지토리 URL을 적어주세요]
cd [폴더명]
2. 필수 패키지 설치

Bash
npm install
3. 로컬 개발 서버 실행

Bash
npm run dev
실행 후 터미널에 나타나는 http://localhost:5174 링크를 클릭하여 브라우저에서 화면을 확인합니다.

🤝 팀원 협업 규칙 (Collaboration Guide)
작업 공간 분리: 본인이 담당한 도메인의 pages 내 해당 컴포넌트 파일(예: Login.jsx)에서만 작업을 진행하여 깃(Git) 충돌을 최소화합니다.

API 통신: 백엔드 API 연동 시 src/api/axios.js에 설정된 api 인스턴스를 사용하여 호출하세요. (로그인 후 발급받은 access_token은 헤더에 자동으로 포함되도록 인터셉터가 설정되어 있습니다.)

UI 디자인: 별도의 CSS 파일 생성 대신 Tailwind CSS 클래스명을 적극 활용하여 디자인 통일성을 유지합니다.

📌 담당 역할 (To-Do)
팀원 A: 사용자/인증 (/api/users), 시작 페이지

팀원 B: 주식 거래 및 내 자산 (/api/trading, /api/stocks)

팀원 C: AI 설문 및 코칭 (/api/ai), 커뮤니티 (/api/community)