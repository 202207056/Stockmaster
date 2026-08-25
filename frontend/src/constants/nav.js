/**
 * 주 메뉴 항목
 *
 * 컴포넌트 파일과 분리해 둡니다. (Fast Refresh 유지 목적)
 * 메뉴를 늘리거나 순서를 바꿀 때는 여기만 고치면 됩니다.
 */
export const NAV_ITEMS = [
  { to: '/dashboard', label: '홈', icon: '🏠' },
  { to: '/favorites', label: '즐겨찾기', icon: '⭐' },
  { to: '/trading', label: '트레이딩', icon: '📈' },
  { to: '/assets', label: '내 자산', icon: '💰' },
  { to: '/community', label: '커뮤니티', icon: '👥' },
  { to: '/learn', label: '학습', icon: '✏️' },
];

export default NAV_ITEMS;
