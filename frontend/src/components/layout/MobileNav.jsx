import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, UserRound } from 'lucide-react';
import { NAV_ITEMS } from '../../constants/nav';
import Modal from '../common/Modal';

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return <>
    <nav className="mobile-primary-nav" aria-label="모바일 주 메뉴">
      {NAV_ITEMS.slice(0, 4).map(({ to, label, Icon }) => <NavLink key={to} to={to}>
        <Icon size={21} strokeWidth={1.75} aria-hidden="true" /><span>{label === '즐겨찾기' ? '관심종목' : label === '트레이딩' ? '거래' : label}</span>
      </NavLink>)}
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog" className={['/community', '/learn', '/mypage'].some(path => pathname.startsWith(path)) ? 'active' : ''}>
        <Menu size={21} aria-hidden="true" /><span>전체 메뉴</span>
      </button>
    </nav>
    <Modal open={open} onClose={() => setOpen(false)} title="전체 메뉴">
      <nav className="mobile-menu-list" aria-label="전체 메뉴">
        {[...NAV_ITEMS, { to: '/mypage', label: '내 정보 · 설정', Icon: UserRound }].map(({ to, label, Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={20} aria-hidden="true" />{label}</NavLink>)}
      </nav>
    </Modal>
  </>;
}
