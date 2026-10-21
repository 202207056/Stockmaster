import { SITE_TOUR_STEPS, siteTourIndex } from '../constants/siteTour';

const PREFIX = 'stockmaster:onboarding:v1:';
const EVENT = 'stockmaster:onboarding-changed';
const memory = new Map();
const valid = value => ['survey', 'seed', 'done', 'tour:start'].includes(value) || (value?.startsWith('tour:') && siteTourIndex(value.slice(5)) >= 0);

export function getOnboarding(userId) {
  if (userId == null) return null;
  const key = PREFIX + userId;
  try {
    const value = localStorage.getItem(key);
    if (valid(value)) return value;
  } catch { /* Keep progress in memory if storage is unavailable. */ }
  return memory.get(key) ?? null;
}

export function setOnboarding(userId, stage) {
  if (userId == null || !valid(stage)) return;
  const key = PREFIX + userId;
  memory.set(key, stage);
  try { localStorage.setItem(key, stage); } catch { /* In-memory fallback. */ }
  window.dispatchEvent(new window.Event(EVENT));
}

export function subscribeOnboarding(listener) {
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', listener); };
}

export function onboardingPath(stage) {
  if (stage === 'tour:start') return '/dashboard?tour=start';
  if (stage === 'survey') return '/survey';
  if (stage === 'seed') return '/seed-money';
  if (stage?.startsWith('tour:') && siteTourIndex(stage.slice(5)) >= 0) {
    const index = siteTourIndex(stage.slice(5));
    return `${SITE_TOUR_STEPS[index].path}?tour=${index}`;
  }
  return null;
}
