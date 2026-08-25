/**
 * 투자성향 설문 문항 · 점수 (Doc/13 §5-4)
 *
 * 왜 프론트에 두는가:
 * GET /api/ai/propensity 는 분석 결과를 만드는 주체가 없어 항상 null 을 돌려줍니다.
 * 그래서 설문 결과 화면을 만들 수 없는데, 규칙 기반 점수는 프론트에서 계산할 수 있습니다.
 * 지금은 이 방법이 Survey 화면을 완성하는 유일한 길입니다.
 *
 * ⚠️ AI 담당자와 문항·배점을 먼저 합의하세요. 서버에서 같은 계산을 하게 되면
 *    이 파일의 calcStyle() 을 지우고 API 결과를 그대로 쓰면 됩니다.
 *
 * 배점 설계
 *  - 문항 6개 × 선택지 4개, 각 0/5/10/15점 → 총점 0~90점
 *  - 점수가 높을수록 위험을 감수하는 성향
 */

export const SURVEY = [
  {
    number: 1,
    question: '투자 경험이 있나요?',
    options: [
      { label: '전혀 없습니다', score: 0 },
      { label: '1년 미만', score: 5 },
      { label: '1~3년', score: 10 },
      { label: '3년 이상', score: 15 },
    ],
  },
  {
    number: 2,
    question: '투자할 자금의 성격이 어떻게 되나요?',
    options: [
      { label: '당장 써야 하는 생활비예요', score: 0 },
      { label: '1년 안에 쓸 계획이 있는 돈이에요', score: 5 },
      { label: '당분간 쓸 일이 없는 여윳돈이에요', score: 10 },
      { label: '오래 묻어 둬도 괜찮은 돈이에요', score: 15 },
    ],
  },
  {
    number: 3,
    question: '손실을 얼마나 감당할 수 있나요?',
    options: [
      { label: '원금이 줄어드는 건 견디기 어려워요', score: 0 },
      { label: '-5% 정도까지는 괜찮아요', score: 5 },
      { label: '-20% 정도까지는 기다릴 수 있어요', score: 10 },
      { label: '-30% 이상도 감수할 수 있어요', score: 15 },
    ],
  },
  {
    number: 4,
    question: '원금을 얼마나 보존하고자 하나요?',
    options: [
      { label: '100% 지켜야 해요', score: 0 },
      { label: '90% 이상은 남았으면 해요', score: 5 },
      { label: '70% 이상이면 괜찮아요', score: 10 },
      { label: '수익이 크다면 크게 상관없어요', score: 15 },
    ],
  },
  {
    number: 5,
    question: '투자 예정기간은 어느 정도인가요?',
    options: [
      { label: '6개월 미만', score: 0 },
      { label: '6개월 ~ 1년', score: 5 },
      { label: '1년 ~ 3년', score: 10 },
      { label: '3년 이상', score: 15 },
    ],
  },
  {
    number: 6,
    question: '투자의 목표가 무엇인가요?',
    options: [
      { label: '예금보다 조금만 더 벌면 돼요', score: 0 },
      { label: '물가가 오르는 만큼은 지키고 싶어요', score: 5 },
      { label: '시장 평균보다 잘하고 싶어요', score: 10 },
      { label: '짧은 기간에 큰 수익을 노리고 싶어요', score: 15 },
    ],
  },
];

export const MAX_SCORE = SURVEY.reduce(
  (sum, q) => sum + Math.max(...q.options.map((o) => o.score)),
  0,
);

/**
 * 총점 → 투자성향.
 * label 은 PUT /api/users/survey 의 investment_style 값으로 그대로 보냅니다.
 */
export const STYLES = [
  {
    max: 20,
    code: 'STABLE',
    label: '안정형',
    summary: '원금을 지키는 것이 가장 중요한 유형이에요.',
    advice: '예금·채권처럼 변동이 작은 자산 위주로 담고, 주식은 아주 적은 비중으로 시작해 보세요.',
    stockRatio: '주식 10~20%',
  },
  {
    max: 40,
    code: 'STABLE_SEEKING',
    label: '안정추구형',
    summary: '큰 손실은 피하면서 예금보다 조금 더 벌고 싶은 유형이에요.',
    advice: '대형 우량주와 배당주 중심으로, 한 종목에 몰지 말고 나눠 담는 연습을 해 보세요.',
    stockRatio: '주식 20~40%',
  },
  {
    max: 60,
    code: 'NEUTRAL',
    label: '위험중립형',
    summary: '기대수익만큼의 위험은 받아들일 수 있는 유형이에요.',
    advice: '업종을 나눠 5~10종목으로 분산하고, 손절 기준을 미리 정해 두면 좋아요.',
    stockRatio: '주식 40~60%',
  },
  {
    max: 80,
    code: 'RISK_SEEKING',
    label: '적극투자형',
    summary: '손실 위험을 감수하고 높은 수익을 노리는 유형이에요.',
    advice: '성장주 비중을 늘리되, 한 종목 비중이 전체의 20%를 넘지 않게 관리해 보세요.',
    stockRatio: '주식 60~80%',
  },
  {
    max: Infinity,
    code: 'AGGRESSIVE',
    label: '공격투자형',
    summary: '큰 변동을 감수하고 최대 수익을 목표로 하는 유형이에요.',
    advice: '변동성이 큰 만큼 손절 규칙을 반드시 지키고, 한 번에 전액을 넣지 마세요.',
    stockRatio: '주식 80% 이상',
  },
];

/** 총점으로 성향 하나를 고릅니다. */
export function calcStyle(totalScore) {
  const score = Number(totalScore) || 0;
  return STYLES.find((s) => score <= s.max) ?? STYLES[STYLES.length - 1];
}

/**
 * 선택 상태(문항번호 -> 선택지 index)를 API 페이로드로 변환합니다.
 * POST /api/ai/survey 는 { answers: [{ question_number, selected_answer }] } 를 받습니다.
 */
export function toAnswerPayload(selections) {
  return SURVEY.filter((q) => selections[q.number] != null).map((q) => ({
    question_number: q.number,
    selected_answer: q.options[selections[q.number]].label,
  }));
}

/** 선택 상태의 총점 */
export function totalScore(selections) {
  return SURVEY.reduce((sum, q) => {
    const idx = selections[q.number];
    return sum + (idx != null ? q.options[idx].score : 0);
  }, 0);
}

/** 모든 문항에 답했는지 */
export function isComplete(selections) {
  return SURVEY.every((q) => selections[q.number] != null);
}
