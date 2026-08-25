import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AuthProvider from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import ApiStatusBanner from './components/system/ApiStatusBanner';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Learn from './pages/Learn';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Assets from './pages/Assets';
import Favorites from './pages/Favorites';
import Community from './pages/Community';
import Survey from './pages/Survey';
import MyPage from './pages/MyPage';
import NotFound from './pages/NotFound';

/**
 * 라우팅 (F-2)
 *
 * 고친 것
 *  1) /trading 이 두 번 등록되어 있던 중복 제거
 *  2) Signup · Favorites · Community 가 파일만 있고 라우트가 없어 접근 불가능하던 문제
 *  3) Landing 의 "가입" 링크가 가리키던 /register 를 /signup 으로 정리하고,
 *     혹시 남아 있을 옛 링크를 위해 /register -> /signup 리다이렉트 유지
 *  4) 없는 주소로 가면 흰 화면만 나오던 것 -> 404 페이지
 *
 * 구조
 *  - Landing 은 자체 전체화면 디자인이라 공통 Layout 밖에 둡니다.
 *  - 나머지는 Layout(헤더·네비·푸터) 아래로 모읍니다.
 *
 * 🔓 접근 제어
 *  아래 화면들은 원래 로그인이 필요하지만, 지금은 `config/features.js` 의
 *  REQUIRE_AUTH 가 false 라서 **ProtectedRoute 가 아무도 막지 않습니다.**
 *  백엔드를 붙이지 않은 지금은 로그인 자체가 불가능하고, 붙인 뒤에도
 *  "로그인 없이 둘러보기"를 지원할 계획이기 때문입니다.
 *
 *  라우트를 ProtectedRoute 로 감싼 구조는 그대로 두었으므로,
 *  나중에 보호가 필요해지면 features.js 의 값 하나만 true 로 바꾸면 됩니다.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 공통 레이아웃 없는 화면 */}
          <Route path="/" element={<Landing />} />

          {/* 공통 레이아웃 */}
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/learn" element={<Learn />} />

            {/* 원래는 로그인 필요 — 현재 REQUIRE_AUTH=false 로 통과 */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trading" element={<Trading />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/community" element={<Community />} />
              <Route path="/survey" element={<Survey />} />
              <Route path="/mypage" element={<MyPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* 콜드스타트 안내는 라우트와 무관하게 항상 떠 있어야 합니다. */}
      <ApiStatusBanner />
    </AuthProvider>
  );
}
