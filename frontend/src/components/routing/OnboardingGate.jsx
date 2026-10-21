import { useSyncExternalStore } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getOnboarding, onboardingPath, subscribeOnboarding } from '../../utils/onboarding';
import { SITE_TOUR_STEPS, siteTourIndex } from '../../constants/siteTour';

export default function OnboardingGate({ children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const stage = useSyncExternalStore(subscribeOnboarding, () => getOnboarding(user?.user_id), () => null);
  const target = isAuthenticated && onboardingPath(stage);
  if (target) {
    // Keep the current tour mounted while progress and navigation update.
    const tour = new URLSearchParams(location.search).get('tour');
    const index = siteTourIndex(tour);
    const inTour = (tour === 'start' && location.pathname === '/dashboard') ||
      (index >= 0 && SITE_TOUR_STEPS[index].path === location.pathname);
    if (stage?.startsWith('tour:') && inTour) return children;
    const [path, search] = target.split('?');
    const onStep = location.pathname === path && (!search || new URLSearchParams(location.search).get('tour') === search.split('=')[1]);
    if (!onStep) return <Navigate to={target} replace />;
  }
  return children;
}
