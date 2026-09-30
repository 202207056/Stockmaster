import { Navigate, useParams } from 'react-router-dom';
import { TRADING_TUTORIALS } from '../constants/tradingTutorials';

export default function TradingLesson() {
  const { tutorialId } = useParams();
  const course = TRADING_TUTORIALS.find(item => item.id === tutorialId);
  return <Navigate replace to={course ? `${course.start || '/trading'}?practice=${course.id}` : '/learn?tab=guide'} />;
}
