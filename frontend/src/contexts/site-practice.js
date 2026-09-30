import { createContext, useContext } from 'react';

export const SitePracticeContext = createContext(null);
export const useSitePractice = () => useContext(SitePracticeContext);
