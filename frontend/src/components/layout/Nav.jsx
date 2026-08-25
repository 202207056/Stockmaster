import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/nav';

/**
 * 주 메뉴 (F-5)
 *
 * 기존에는 Dashboard.jsx 안에 <a href="#"> 로 하드코딩되어 있어서
 * (1) 아무 데도 이동하지 않고 (2) 다른 화면에는 메뉴 자체가 없었습니다.
 * NavLink 로 바꾸면 현재 위치 강조도 라우터가 알아서 해 줍니다.
 *
 * 로그인 여부와 상관없이 모든 메뉴가 보이고 눌립니다.
 * (접근 제어는 config/features.js 의 REQUIRE_AUTH 로만 결정됩니다)
 */
export default function Nav({ className = '' }) {
  return (
    <nav aria-label="주 메뉴" className={`flex gap-6 text-sm font-medium ${className}`}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 border-b-2 pb-1 whitespace-nowrap transition ${
              isActive
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`
          }
        >
          <span className="text-lg" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
