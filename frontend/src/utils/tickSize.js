/**
 * 호가 단위(틱) — 주문 입력 방어용 (Doc/13 §5-3)
 *
 * 백엔드가 클라이언트가 보낸 가격을 그대로 신뢰하는 결함이 있습니다.
 * 프론트가 그 결함을 고칠 수는 없지만, 정상 사용자가 이상한 값을 넣지 않도록
 * 입력 단계에서 막을 수는 있습니다.
 *
 * ⚠️ 호가 단위는 시장·시점에 따라 바뀝니다. 아래 값은 국내주식(코스피/코스닥)
 *    2023-01 개정 기준입니다. 실제 서비스 전 공식 자료로 재확인하세요.
 */

export function tickSize(price) {
  const p = Number(price) || 0;
  if (p < 2000) return 1;
  if (p < 5000) return 5;
  if (p < 20000) return 10;
  if (p < 50000) return 50;
  if (p < 200000) return 100;
  if (p < 500000) return 500;
  return 1000;
}

/** 입력값을 가장 가까운 호가 단위로 내림 정렬 */
export function snapToTick(price) {
  const p = Number(price) || 0;
  const t = tickSize(p);
  return Math.floor(p / t) * t;
}

/** 지정가 입력 허용 범위 (현재가 ±30%) */
export const PRICE_LIMIT_RATIO = 0.3;

export function priceBounds(currentPrice) {
  const c = Number(currentPrice) || 0;
  if (c <= 0) return { min: 0, max: 0, enabled: false };
  return {
    min: snapToTick(c * (1 - PRICE_LIMIT_RATIO)),
    max: snapToTick(c * (1 + PRICE_LIMIT_RATIO)),
    enabled: true,
  };
}

/** 주문 입력 검증. 문제가 없으면 null, 있으면 사용자에게 보여줄 문구를 반환 */
export function validateOrderPrice(price, currentPrice) {
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) return '가격을 입력해 주세요.';
  const { min, max, enabled } = priceBounds(currentPrice);
  if (!enabled) return null; // 현재가를 못 받았으면 범위 검증 생략
  if (p < min || p > max) {
    return `현재가의 ±30% 범위(${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')}원) 안에서 주문할 수 있어요.`;
  }
  if (p % tickSize(p) !== 0) {
    return `${tickSize(p).toLocaleString('ko-KR')}원 단위로 입력해 주세요.`;
  }
  return null;
}
