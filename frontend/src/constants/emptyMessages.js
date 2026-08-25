import { MessageSquare, Newspaper, Receipt, Search, Star, TrendingUp } from 'lucide-react';

/**
 * EmptyState 문구 프리셋
 *
 * 화면마다 문구를 새로 지으면 톤이 흔들려서 한곳에 모았습니다.
 * (컴포넌트 파일이 아닌 별도 파일에 둔 이유: 컴포넌트와 상수를 같은 파일에서
 *  내보내면 Vite 의 Fast Refresh 가 매번 전체 리로드로 떨어집니다.)
 *
 * 이 프로젝트에서 "비어 있음"은 오류가 아니라 정상 상황인 경우가 많습니다.
 *   - 종목이 30개뿐이라 검색 결과가 자주 비어 있음 (Doc/13 §4-5)
 *   - 뉴스 크롤링 실패 시 빈 배열이 옴 (Doc/13 §3-6)
 * 그래서 문구는 "실패"가 아니라 "다음에 뭘 하면 되는지"를 말합니다.
 *
 * 아이콘은 lucide 선 아이콘입니다. 이모지를 쓰면 OS·브라우저마다 모양과 색이 달라
 * 화면 톤이 흔들립니다. (Doc/17 §12-3)
 */
export const EMPTY_MESSAGES = {
  stockSearch: {
    Icon: Search,
    title: '등록된 종목이 아니에요',
    description: '현재 코스피 대표 30종목만 제공됩니다. 다른 종목으로 검색해 보세요.',
  },
  favorites: {
    Icon: Star,
    title: '관심종목이 아직 없어요',
    description: '종목 상세 화면에서 별표를 눌러 추가해 보세요.',
  },
  holdings: {
    Icon: TrendingUp,
    title: '보유한 종목이 없어요',
    description: '트레이딩 화면에서 첫 주문을 넣어 보세요.',
  },
  orders: {
    Icon: Receipt,
    title: '주문 내역이 없어요',
    description: '매수 또는 매도 주문을 넣으면 여기에 표시됩니다.',
  },
  news: {
    Icon: Newspaper,
    title: '표시할 뉴스가 없어요',
    description: '잠시 후 다시 확인해 주세요.',
  },
  posts: {
    Icon: MessageSquare,
    title: '아직 글이 없어요',
    description: '첫 글을 남겨 보세요.',
  },
  comments: {
    Icon: MessageSquare,
    title: '댓글이 아직 없어요',
    description: '첫 댓글을 남겨 보세요.',
  },
};

export default EMPTY_MESSAGES;
