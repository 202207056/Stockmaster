import axios from 'axios';

// 백엔드(FastAPI) 기본 주소 설정
const api = axios.create({
  baseURL: 'http://localhost:8000', // 실제 백엔드 서버 주소로 변경 필요
  headers: {
    'Content-Type': 'application/json',
  },
});

// 모든 API 요청이 서버로 가기 직전에 가로채서 로그인 토큰(access_token)을 넣어주는 마법의 코드
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;