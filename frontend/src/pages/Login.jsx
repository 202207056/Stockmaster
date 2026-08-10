import React from 'react';
import api from '../api/axios'; // 백엔드 통신용

function Login() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">로그인 (사용자/인증 도메인)</h1>
        <p className="text-gray-500 text-sm">POST /api/users/login 기능이 들어갈 자리입니다.</p>
        {/* 팀원 A는 여기서부터 로그인 폼 UI를 만들고 axios로 통신을 붙이면 됩니다! */}
      </div>
    </div>
  );
}

export default Login;