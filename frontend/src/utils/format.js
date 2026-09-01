/**
 * 금액 · 수익률 포맷 유틸 (Doc/13 §4-1)
 *
 * 백엔드 응답에서 금액 필드의 타입이 일관되지 않습니다.
 *   /trading/accounts  balance, withdrawable_cash -> 문자열 "10000000.00"
 *   /trading/orders    price                      -> 문자열 "75000.00"
 *   /trading/portfolio balance, avg_price, ...    -> 숫자
 *   /stocks/{c}/price  current_price              -> 숫자
 * 따라서 화면에 찍는 모든 금액은 이 파일의 함수를 통과시킵니다.
 */

/** 무엇이 오든 안전하게 숫자로. null/undefined/"" /NaN -> 0 */
export const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** 12345 -> "12,345" */
export const comma = (v) => num(v).toLocaleString('ko-KR');

/** 12345 -> "12,345원" */
export const won = (v) => `${comma(Math.round(num(v)))}원`;

/** 12345 -> "+12,345원" / -12345 -> "-12,345원" (0은 부호 없음) */
export const wonSigned = (v) => {
  const n = Math.round(num(v));
  return `${n > 0 ? '+' : ''}${comma(n)}원`;
};

/** 1.5 -> "+1.50%" */
export const rate = (v, digits = 2) => {
  const n = num(v);
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
};

/** 부호 판정: 'up' | 'down' | 'flat' */
export const sign = (v) => {
  const n = num(v);
  return n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
};

/**
 * 등락에 따른 Tailwind 텍스트 색 클래스.
 * 한국 증시 관례: 상승=빨강, 하락=파랑.
 */
export const signTextClass = (v) =>
  ({ up: 'text-up-600', down: 'text-down-600', flat: 'text-flat-500' })[sign(v)];

/** 등락 배경(연한 색) 클래스 */
export const signBgClass = (v) =>
  ({ up: 'bg-up-50', down: 'bg-down-50', flat: 'bg-flat-50' })[sign(v)];

/** 등락 테두리 클래스 — 지수 카드처럼 배경과 함께 쓸 때 */
export const signBorderClass = (v) =>
  ({ up: 'border-up-100', down: 'border-down-100', flat: 'border-gray-100' })[sign(v)];

/**
 * 색상만으로 등락을 구분하면 색약 사용자가 읽을 수 없습니다.
 * 기호를 함께 표기합니다. (Doc/13 §10 차별화 체크리스트)
 */
export const signMark = (v) => ({ up: '▲', down: '▼', flat: '–' })[sign(v)];

/** "▲ 1.50%" 처럼 기호 + 수익률 */
export const rateWithMark = (v, digits = 2) => {
  const n = num(v);
  return `${signMark(n)} ${Math.abs(n).toFixed(digits)}%`;
};

/**
 * 지수·금·환율 값 표기 (헤더 티커 · 홈 상단 카드 공용)
 *
 * 항목마다 자릿수와 단위가 다릅니다.
 *   코스피 2,712.34  (소수 2자리, 단위 없음)
 *   금     128,400원 (소수 0자리, 원)
 *   달러   1,382.50원 (소수 2자리, 원)
 */
export const marketValue = (v, decimals = 2, unit = '') =>
  num(v).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + unit;

/**
 * 전일대비 값. 부호를 붙이고 자릿수·단위를 값과 똑같이 맞춥니다.
 * "+18.22" / "-4.20원" / "+540원"
 * (값에는 '원'이 붙는데 전일대비에는 안 붙으면 같은 카드 안에서 단위가 어긋나 보입니다)
 */
export const marketChange = (v, decimals = 2, unit = '') => {
  const n = num(v);
  return `${n > 0 ? '+' : ''}${marketValue(n, decimals, unit)}`;
};

/** 큰 금액 축약: 123456789 -> "1.23억" */
export const wonShort = (v) => {
  const n = num(v);
  const abs = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (abs >= 1_0000_0000) return `${s}${(abs / 1_0000_0000).toFixed(2)}억`;
  if (abs >= 1_0000) return `${s}${(abs / 1_0000).toFixed(0)}만`;
  return `${s}${comma(abs)}`;
};

/**
 * 차트 API 의 날짜는 "YYYYMMDD" 문자열입니다. (Doc/13 §3-3)
 * "20240115" -> "2024-01-15"
 */
export const ymdToISO = (ymd) => {
  const s = String(ymd ?? '');
  if (!/^\d{8}$/.test(s)) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};

/** "2026-08-25T10:30:00" -> "2026.08.25 10:30" */
export const dateTime = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** 목록에서 쓰는 상대시간: "3분 전" */
export const fromNow = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return dateTime(v).slice(0, 10);
};
