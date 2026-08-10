import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 🌟 여기서부터 불러오기(import)가 하나라도 빠지면 하얀 화면이 뜹니다!
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Trading from './pages/Trading';
import Assets from './pages/Assets';
import Survey from './pages/Survey';
import Landing from './pages/Landing';

function App() {
  return (
    // BrowserRouter: 주소창의 URL을 감지하는 역할
    <BrowserRouter>
      {/* Routes: 여러 개의 길(Route)들을 묶어주는 역할 */}
      <Routes>

        <Route path="/" element={<Landing />} />
        
        {/* 접속 주소가 '/' (기본 홈) 일 때 -> Dashboard 화면을 보여줌 */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* 접속 주소가 '/login' 일 때 -> Login 화면을 보여줌 */}
        <Route path="/login" element={<Login />} />
        
        {/* 접속 주소가 '/trading' 일 때 -> Trading 화면을 보여줌 */}
        <Route path="/trading" element={<Trading />} />
        
        {/* 추가로 필요한 화면(AI 설문, 커뮤니티 등)은 팀원들이 여기에 한 줄씩 추가하면 됩니다! */}
        <Route path="/trading" element={<Trading />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/survey" element={<Survey />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;