import { MousePointer2 } from 'lucide-react';

export default function TutorialPointer() {
  return <span className="tutorial-pointer" aria-hidden="true"><MousePointer2 size={24} fill="white"/><span>여기를 클릭</span></span>;
}
