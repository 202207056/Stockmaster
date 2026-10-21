import './TutorialSkipButton.css';

export default function TutorialSkipButton({ onSkip }) {
  return <button type="button" className="tutorial-skip-button" onClick={event => { event.stopPropagation(); onSkip(); }}>건너뛰기</button>;
}
