import api from './client';

const path = '/users/me/favorites';
export const fetchFavoriteLibrary = async signal => (await api.get(path, { signal, cache: false })).data;
export const putFavoriteLibrary = async (library, signal) => (await api.put(path, library, { signal })).data;
