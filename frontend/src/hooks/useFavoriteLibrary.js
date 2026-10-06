import { useEffect, useState } from 'react';
import { FAVORITES_EVENT, getFavorites, getFavoriteGroups, getRecentStocks } from '../utils/favorites';

const read = () => ({ codes: getFavorites(), groups: getFavoriteGroups(), recent: getRecentStocks() });

export default function useFavoriteLibrary() {
  const [library, setLibrary] = useState(read);
  useEffect(() => {
    const sync = () => setLibrary(read());
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return library;
}
