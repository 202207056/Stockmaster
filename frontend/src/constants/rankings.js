export const RANKING_CATEGORIES = [
  { id: 'amount', label: '거래대금 상위', metric: '거래대금', field: 'amount', unit: 'won' },
  { id: 'change', label: '급상승', metric: '거래대금', field: 'amount', unit: 'won' },
  { id: 'volume', label: '인기 종목', metric: '거래량', field: 'volume', unit: 'shares' },
  { id: 'decline', label: '급하락', metric: '거래대금', field: 'amount', unit: 'won' },
  { id: 'market_cap', label: '시가총액 상위', metric: '시가총액', field: 'market_cap', unit: 'won' },
  { id: 'volume_surge', label: '거래량 급증', metric: '거래량 증가율', field: 'volume_increase_rate', unit: 'percent' },
];
