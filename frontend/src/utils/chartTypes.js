export const CHART_TYPES = [
  { id: 'line', label: '꺾은선', description: '각 봉의 종가를 연결합니다. 흐름을 간단히 보지만 봉 안의 고가·저가는 보이지 않습니다.' },
  { id: 'candle', label: '캔들', description: '몸통은 시가와 종가, 꼬리는 고가와 저가입니다. 빨강은 종가가 시가 이상, 파랑은 시가 미만입니다. 전일 대비 등락과는 다릅니다.' },
  { id: 'bar', label: 'OHLC 바', description: '세로선은 저가~고가, 왼쪽 눈금은 시가, 오른쪽은 종가입니다. 캔들과 같은 네 가격을 다른 모양으로 표시합니다.' },
  { id: 'area', label: '영역', description: '종가 선 아래를 채웁니다. 색칠한 넓이는 거래량이나 수익이 아닙니다. 꺾은선과 같은 종가 데이터입니다.' },
  { id: 'baseline', label: '기준선', description: '조회 구간 첫 종가보다 높은지 낮은지 색으로 구분합니다. 기준은 전일 종가나 내 매입가가 아닙니다. 조회 기간을 바꾸면 기준도 바뀝니다.' },
  { id: 'heikin', label: '하이킨아시', description: 'OHLC를 평균내어 만든 합성 봉입니다. 흐름은 부드러워지지만 표시 가격은 실제 거래가격이 아닙니다. 주문 가격으로 사용하지 마세요.' },
  { id: 'renko', label: '렌코 · 종가 기준', description: '설정한 가격 폭마다 벽돌을 그립니다. 가로 간격은 같은 시간이 아닙니다. 여기서는 제공된 종가만 사용하므로 장중 움직임을 모두 재현하지 못합니다.' },
];

export function heikinAshi(rows) {
  const output = [];
  rows.forEach((row, i) => {
    const previous = output[i - 1];
    const open = previous ? (previous.open + previous.close) / 2 : (row.open + row.close) / 2;
    const close = (row.open + row.high + row.low + row.close) / 4;
    output.push({ ...row, open, close, high: Math.max(row.high, open, close), low: Math.min(row.low, open, close) });
  });
  return output;
}

// Fixed box, close-only, two-box reversal; seed is first supplied close.
export function renkoBricks(rows, boxSize) {
  if (!rows.length || !Number.isFinite(boxSize) || boxSize <= 0) return { rows: [], truncated: false };
  let anchor = rows[0].close, direction = 0;
  const bricks = [];
  for (const row of rows.slice(1)) {
    let delta = row.close - anchor;
    const nextDirection = Math.sign(delta);
    if (!nextDirection) continue;
    const reverse = direction && nextDirection !== direction;
    if (Math.abs(delta) < boxSize * (reverse ? 2 : 1)) continue;
    if (reverse) anchor += nextDirection * boxSize;
    delta = row.close - anchor;
    const count = Math.floor((Math.abs(delta) + boxSize * 1e-10) / boxSize);
    for (let n = 0; n < count; n++) {
      if (bricks.length >= 2000) return { rows: bricks, truncated: true };
      const close = anchor + nextDirection * boxSize;
      bricks.push({ ...row, key: `brick:${bricks.length}`, open: anchor, close, high: Math.max(anchor, close), low: Math.min(anchor, close) });
      anchor = close;
    }
    direction = nextDirection;
  }
  return { rows: bricks, truncated: false };
}

export function simpleMovingAverage(rows, period) {
  return rows.map((_, i) => i + 1 < period ? null : rows.slice(i + 1 - period, i + 1).reduce((sum, row) => sum + row.close, 0) / period);
}

export const CHART_EXAMPLE = Array.from({ length: 40 }, (_, i) => {
  const close = 10000 + i * 30 + [0, 120, -80, 150, -100, 40, -120, 60][i % 8];
  const open = close + (i % 2 ? 120 : -90);
  return { date: `예시 ${i + 1}`, label: `예시 ${i + 1}`, key: `example:${i}`, open, close, high: Math.max(open, close) + 110, low: Math.min(open, close) - 100, volume: 1000 + i % 7 * 300 };
});
