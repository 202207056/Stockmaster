import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/nav';

/**
 * 주 메뉴 (F-5)
 *
 * 기존에는 Dashboard.jsx 안에 <a href="#"> 로 하드코딩되어 있어서
 * (1) 아무 데도 이동하지 않고 (2) 다른 화면에는 메뉴 자체가 없었습니다.
 * NavLink 로 바꾸면 현재 위치 강조도 라우터가 알아서 해 줍니다.
 *
 * 상태 표현 — 회색 한 톤으로 통일했습니다.
 *   평상시  text-gray-400  (아이콘·글자 모두)
 *   마우스  text-gray-600
 *   선택됨  text-gray-900 + 굵게 + 아래 밑줄
 * 아이콘이 `currentColor` 를 따르므로 글자와 항상 같은 농도로 움직입니다.
 *
 * 로그인 여부와 상관없이 모든 메뉴가 보이고 눌립니다.
 * (접근 제어는 config/features.js 의 REQUIRE_AUTH 로만 결정됩니다)
 */
export default function Nav({ className = '' }) {
  return (
    <nav aria-label="주 메뉴" className={`flex gap-6 text-sm ${className}`}>
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 border-b-2 pb-1 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-gray-900 font-bold text-gray-900'
                : 'border-transparent font-medium text-gray-400 hover:text-gray-600'
            }`
          }
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
