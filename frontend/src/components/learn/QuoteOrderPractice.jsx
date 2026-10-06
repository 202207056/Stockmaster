import { useState } from 'react';

const LESSONS = {
  midResult: {
    title: '중간가', initial: '50,000원', formula: '(49,900원 + 50,100원) ÷ 2',
    explanation: '사는 쪽과 파는 쪽의 가장 좋은 가격 사이에서 거래하려는 주문입니다. 가격을 직접 입력하지 않으며, 상대 주문이 있어야 체결됩니다.',
    action: '양쪽 호가를 200원 올려 보기', changed: '50,200원',
    change: '매수 50,100원 · 매도 50,300원으로 바뀌어 중간 가격도 50,200원이 됩니다. 처음의 50,000원에 고정되는 주문이 아닙니다.',
    question: '중간가를 선택하면 처음 계산한 가격이 계속 유지될까요?',
    wrong: '처음 가격에 계속 고정돼요', correct: '양쪽 호가에 따라 달라져요',
    feedback: '맞아요. 호가가 바뀌면 중간 가격도 바뀔 수 있어요. 다만 가격이 계산됐다고 체결된 것은 아닙니다.',
    retry: '중간 가격은 두 호가로 다시 계산합니다. 바뀐 호가의 평균을 확인해 보세요.',
  },
  bestResult: {
    title: '최유리지정가', initial: '50,100원', formula: '매수할 때는 상대편의 가장 낮은 매도 호가',
    explanation: '지금 가장 싸게 팔겠다는 가격으로 매수 가격을 정합니다. 이 예시에서는 50,100원에 100주가 있어 1주를 그 가격에 살 수 있습니다.',
    action: '체결 전에 매도 호가가 올라간 경우 보기', changed: '50,100원 유지',
    change: '별도 상황을 비교합니다. 접수 가격을 정한 직후 50,100원 매도 물량이 사라지고 최저 매도 호가가 50,300원이 되었다고 가정하면, 주문 가격은 50,100원 그대로여서 미체결입니다.',
    question: '접수 후 매도 호가가 오르면 내 주문도 따라 올라갈까요?',
    wrong: '새 매도 호가까지 따라 올라가요', correct: '접수한 50,100원에 남아요',
    feedback: '맞아요. 접수 시 정한 가격에 고정됩니다. 이름에 최유리가 들어가도 항상 체결되거나 가장 좋은 수익을 보장하지는 않아요.',
    retry: '최유리지정가는 접수 시 상대편 호가로 가격을 정한 지정가 주문입니다. 새 가격을 계속 따라가지 않아요.',
  },
  ownResult: {
    title: '최우선지정가', initial: '49,900원', formula: '매수할 때는 같은 편의 가장 높은 매수 호가',
    explanation: '다른 사람들이 사겠다고 내놓은 가장 높은 가격으로 주문합니다. 지금 파는 쪽은 50,100원을 원하므로 49,900원 매수는 기다립니다.',
    action: '다른 매수자가 50,000원을 제시하면?', changed: '49,900원 유지',
    change: '최고 매수 호가가 50,000원으로 높아져도 내 주문은 접수한 49,900원에 남습니다. 최우선이라는 이름이 항상 맨 앞 순서나 체결을 보장하지는 않습니다.',
    question: '매수할 때 최유리와 최우선은 어느 쪽 호가를 사용할까요?',
    wrong: '둘 다 가장 낮은 매도 호가', correct: '최유리는 매도, 최우선은 매수 호가',
    feedback: '맞아요. 같은 초기 호가에서도 최유리는 50,100원, 최우선은 49,900원입니다. 매도 주문에서는 반대로 최유리는 매수 호가, 최우선은 매도 호가를 사용해요.',
    retry: '내가 매수자라면 상대편은 매도자, 같은 편은 매수자입니다. 이 차이를 다시 확인해 보세요.',
  },
};

export default function QuoteOrderPractice({ kind, onReady }) {
  const lesson = LESSONS[kind];
  const [changed, setChanged] = useState(false);
  const [matched, setMatched] = useState(false);
  const [answer, setAnswer] = useState(null);
  const choose = correct => { setAnswer(correct); onReady(correct && changed && (kind !== 'ownResult' || matched)); };
  return <>
    <p>{lesson.explanation}</p>
    <dl><dt>{kind === 'midResult' && changed ? '바뀐 매수 1호가' : '처음 매수 1호가'}</dt><dd>{kind === 'midResult' && changed ? '50,100원' : '49,900원'}</dd><dt>{kind === 'midResult' && changed ? '바뀐 매도 1호가' : '처음 매도 1호가'}</dt><dd>{kind === 'midResult' && changed ? '50,300원' : '50,100원'}</dd><dt>{lesson.title} 매수 가격</dt><dd>{changed ? lesson.changed : lesson.initial}</dd></dl>
    <p><strong>가격 기준:</strong> {kind === 'midResult' && changed ? '(50,100원 + 50,300원) ÷ 2 = 50,200원' : lesson.formula}</p>
    <div className="buy-concept-result" role="status"><strong>{kind === 'midResult' ? '가격 계산 완료 · 상대 주문이 없어 대기' : kind === 'bestResult' ? changed ? '비교 상황: 가격이 올라 미체결' : '최초 상황: 1주 · 50,100원에 가상 체결' : matched ? '1주 · 49,900원에 가상 체결' : '49,900원에서 대기'}</strong></div>
    {!changed && <button type="button" onClick={() => setChanged(true)}>{lesson.action}</button>}
    {changed && <>
      <p>{lesson.change}</p>
      {kind === 'ownResult' && !matched && <button type="button" onClick={() => setMatched(true)}>앞선 주문이 모두 소진된 뒤 49,900원 매도 1주 만나기</button>}
      {kind === 'ownResult' && matched && <p>앞서 기다리던 매수 주문이 모두 체결된 뒤, 내 가격으로 팔겠다는 1주가 들어온 경우입니다. 앞선 주문과 매도 물량에 따라 기다리는 시간과 체결 여부는 달라집니다.</p>}
      {(kind !== 'ownResult' || matched) && <fieldset><legend>{lesson.question}</legend><button type="button" onClick={() => choose(false)}>{lesson.wrong}</button><button type="button" onClick={() => choose(true)}>{lesson.correct}</button></fieldset>}
      {answer !== null && <p role="status">{answer ? lesson.feedback : lesson.retry}</p>}
    </>}
    <p className="buy-concept-caption">독립적인 교육 예시이며 비교 주문은 계좌에 반영하지 않습니다. 수수료를 제외한 가격으로 비교합니다. 실제 거래의 주문 순서·부분 체결·거래 시간 제한은 모두 재현하지 않습니다.{kind === 'midResult' && ' 실제 중간가 체결에는 상대 주문 등 조건이 필요합니다. 이 사이트의 일반 모의 주문은 실시간 재가격 대신 체결 확인을 누를 때 호가와 중간 가격을 갱신합니다.'}</p>
  </>;
}
