import { BookOpen, ChartCandlestick, House, Star, Users, Wallet } from 'lucide-react';

/**
 * 주 메뉴 항목
 *
 * 컴포넌트 파일과 분리해 둡니다. (Fast Refresh 유지 목적)
 * 메뉴를 늘리거나 순서를 바꿀 때는 여기만 고치면 됩니다.
 *
 * 아이콘은 lucide-react 의 선(stroke) 아이콘입니다. 이모지에서 바꾼 이유:
 *  - 이모지는 OS·브라우저마다 모양과 색이 달라 통일된 톤을 만들 수 없습니다
 *  - 색을 지정할 수 없어 "선택 시 진해지는" 상태 표현이 불가능했습니다
 * lucide 아이콘은 `currentColor` 를 따르므로 부모의 text-* 클래스로 색이 결정됩니다.
 *
 * ⚠️ lucide-react v1 에서 이름이 바뀐 아이콘이 있습니다.
 *    Home -> House, CandlestickChart -> ChartCandlestick
 */
export const NAV_ITEMS = [
  { to: '/dashboard', label: '홈', Icon: House },
  { to: '/favorites', label: '즐겨찾기', Icon: Star },
  { to: '/trading', label: '트레이딩', Icon: ChartCandlestick },
  { to: '/assets', label: '내 자산', Icon: Wallet },
  { to: '/community', label: '커뮤니티', Icon: Users },
  { to: '/learn', label: '학습', Icon: BookOpen },
];

export default NAV_ITEMS;
