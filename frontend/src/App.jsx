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
 * 라우팅
 *
 * 고친 것
 *  1) /trading 이 두 번 등록되어 있던 중복 제거
 *  2) Signup · Favorites · Community 가 파일만 있고 라우트가 없어 접근 불가능하던 문제
 *  3) Landing 의 "가입" 링크가 가리키던 /register 를 /signup 으로 정리하고,
 *     혹시 남아 있을 옛 링크를 위해 /register -> /signup 리다이렉트 유지
 *  4) 없는 주소로 가면 흰 화면만 나오던 것 -> 404 페이지
 *
 * 구조
 *  - Landing 과 Survey 는 공통 Layout(헤더·네비) **밖**입니다.
 *    Landing 은 자체 전체화면 디자인이고, Survey 는 가입 직후 한 번 뜨는 온보딩이라
 *    메뉴로 새어 나가지 않도록 의도적으로 헤더를 빼 두었습니다.
 *  - 나머지는 Layout 아래로 모읍니다.
 *
 * 🔓 접근 제어
 *  아래 화면들은 원래 로그인이 필요하지만, 지금은 `config/features.js` 의
 *  REQUIRE_AUTH 가 false 라서 **ProtectedRoute 가 아무도 막지 않습니다.**
 *  화면 둘러보기는 허용하되 인증이 필요한 데이터는 로그인 후 조회합니다.
 *  보호가 필요해지면 features.js 의 값 하나만 true 로 바꾸면 됩니다.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 공통 레이아웃 없는 화면 */}
          <Route path="/" element={<Landing />} />
          <Route
            path="/survey"
            element={
              <ProtectedRoute>
                <Survey />
              </ProtectedRoute>
            }
          />

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
