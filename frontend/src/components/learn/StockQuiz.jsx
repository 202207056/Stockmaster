import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleHelp } from 'lucide-react';
import useLearning from '../../hooks/useLearning';
import { EMPTY_ANSWER, recordAnswer } from '../../utils/learning';
import { STOCK_QUIZ_STAGES, stockQuizKey } from '../../constants/stockQuiz';
import { LearningButton, StorageNotice } from './LearningUI';
import './StockQuiz.css';

export default function StockQuiz({ scope }) {
  const [params, setParams] = useSearchParams();
  const { store, state } = useLearning(scope);
  const stage = STOCK_QUIZ_STAGES.find(item => item.id === params.get('stage'));
  const read = question => store.read(stockQuizKey(question.id), EMPTY_ANSWER);
  const count = STOCK_QUIZ_STAGES.flatMap(item => item.questions).filter(question => read(question).answered).length;
  const navigate = id => { const next = new URLSearchParams(params); next.set('tab', 'quiz'); if (id) next.set('stage', id); else next.delete('stage'); setParams(next); };
  return <div className="stock-quiz">
    <header className="learn-section-heading"><div><h2>단계별 주식 퀴즈</h2></div><span>{count} / 20문항 풀이 완료</span></header>
    {stage ? <><button type="button" className="quiz-back" onClick={() => navigate(null)}>← 전체 단계 보기</button><QuizStage key={stage.id} stage={stage} store={store} navigate={navigate} /></> : <div className="quiz-stage-list">{STOCK_QUIZ_STAGES.map((item, index) => {
      const answers = item.questions.map(read);
      const answered = answers.filter(answer => answer.answered).length;
      const correct = answers.filter(answer => answer.answered && answer.correct).length;
      return <button type="button" key={item.id} className="quiz-stage-card" onClick={() => navigate(item.id)}><span className="quiz-stage-number">{answered === item.questions.length ? <CheckCircle2 size={24} aria-label="풀이 완료" /> : String(index + 1).padStart(2, '0')}</span><span className="quiz-stage-copy"><strong>{item.title}</strong><span>{item.description}</span><small>OX 2문항 · 객관식 2문항{answered > 0 && ` · ${answered}/4 풀이 · 현재 ${correct}/4 정답`}</small></span><ArrowRight size={19} aria-hidden="true" /></button>;
    })}</div>}
    {!state.persistent && <StorageNotice state={state} />}
  </div>;
}

function QuizStage({ stage, store, navigate }) {
  const answers = stage.questions.map(question => store.read(stockQuizKey(question.id), EMPTY_ANSWER));
  const [index, setIndex] = useState(() => Math.max(0, answers.findIndex(answer => !answer.answered)));
  const question = stage.questions[index];
  const saved = answers[index];
  const answered = answers.filter(answer => answer.answered).length;
  const complete = answered === stage.questions.length;
  const stageIndex = STOCK_QUIZ_STAGES.indexOf(stage);
  const nextStage = STOCK_QUIZ_STAGES[stageIndex + 1];
  return <section className="quiz-player" aria-label={stage.title}>
    <div className="quiz-player-heading"><span className="quiz-tag">STEP {stageIndex + 1}</span><span>{answered} / {stage.questions.length} 풀이 완료</span></div>
    <h3>{stage.title}</h3>
    <nav className="quiz-question-nav" aria-label="문항 선택">{stage.questions.map((item, i) => <button type="button" key={item.id} aria-current={index === i ? 'step' : undefined} aria-label={`${i + 1}번 문제${answers[i].answered ? answers[i].correct ? ' 정답' : ' 복습 필요' : ' 미응답'}`} onClick={() => setIndex(i)}>{i + 1}{answers[i].answered && <span aria-hidden="true">{answers[i].correct ? ' ✓' : ' ·'}</span>}</button>)}</nav>
    <QuizQuestion key={`${question.id}:${saved.attempts}`} question={question} saved={saved} onSubmit={choice => store.write(stockQuizKey(question.id), recordAnswer(saved, choice, question.correct))} />
    <div className="quiz-controls"><LearningButton secondary disabled={index === 0} onClick={() => setIndex(index - 1)}>이전 문제</LearningButton>{index < stage.questions.length - 1 && <LearningButton disabled={!saved.answered} onClick={() => setIndex(index + 1)}>다음 문제 →</LearningButton>}</div>
    {complete && <div className="quiz-result" role="status"><CheckCircle2 size={24} aria-hidden="true" /><h4>이 단계의 문제를 모두 풀었어요!</h4><p>첫 풀이 {answers.filter(answer => answer.firstCorrect).length} / 4 정답 · 현재 {answers.filter(answer => answer.correct).length} / 4 정답</p><p>틀린 문제는 문항 번호를 눌러 해설을 읽고 다시 풀어보세요.</p><div className="quiz-controls">{nextStage ? <LearningButton onClick={() => navigate(nextStage.id)}>다음 단계: {nextStage.title} →</LearningButton> : <LearningButton onClick={() => navigate(null)}>전체 단계 돌아보기</LearningButton>}<Link to="/learn?tab=courses">기초 과정에서 더 배우기</Link></div></div>}
  </section>;
}

function QuizQuestion({ question, saved, onSubmit }) {
  const [choice, setChoice] = useState(-1);
  const [retrying, setRetrying] = useState(false);
  const locked = saved.answered && !retrying;
  const selected = locked ? saved.selected : choice;
  return <div className="quiz-question">
    <span className="quiz-type"><CircleHelp size={15} aria-hidden="true" />{question.type === 'ox' ? 'OX 퀴즈' : '객관식 · 정답 1개'}</span>
    <fieldset disabled={locked}><legend>{question.prompt}</legend><div className={`quiz-options ${question.type === 'ox' ? 'is-ox' : ''}`}>{question.options.map((option, i) => <label key={option} className={`quiz-option ${selected === i ? 'is-selected' : ''} ${locked && i === question.correct ? 'is-correct' : ''}`}><input type="radio" name={question.id} checked={selected === i} onChange={() => setChoice(i)} /><span>{option}</span>{locked && i === question.correct && <span className="quiz-answer-label">정답</span>}</label>)}</div></fieldset>
    {locked ? <><div className="quiz-feedback" role="status"><strong>{saved.correct ? '정답이에요!' : '괜찮아요. 해설을 함께 확인해요.'}</strong><p><b>정답: {question.options[question.correct]}</b></p><p>{question.explanation}</p></div><LearningButton secondary onClick={() => { setChoice(-1); setRetrying(true); }}>이 문제 다시 풀기</LearningButton></> : <LearningButton disabled={choice < 0} onClick={() => onSubmit(choice)}>정답 확인</LearningButton>}
  </div>;
}
