import { useSyncExternalStore } from 'react';
import { getLearningStore } from '../utils/learningStore';

export default function useLearning(scope) {
  const store = getLearningStore(scope);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { state, store };
}
