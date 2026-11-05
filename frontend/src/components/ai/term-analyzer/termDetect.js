import api, { getToken } from '../../../api/client';
import { validateDetected } from './readMarks';

export const TERM_DETECT_PATH = '/ai/term-detect';
const MAX_TEXT = 3000;
const MESSAGES = {
  401: '로그인이 필요해요. 다시 로그인해 주세요.',
  429: 'AI 찾기를 너무 자주 했어요. 잠시 후 다시 해 주세요.',
  503: 'AI 찾기를 잠시 사용할 수 없어요. 사전 결과는 그대로 볼 수 있어요.',
};

// ask: the text is one word the user searched for, so the AI explains that word itself.
export async function detectTerms(text, known, signal, { ask = false } = {}) {
  if (!getToken()) throw new Error('로그인하면 AI가 사전에 없는 말도 찾아 줘요.');
  try {
    const { data } = await api.post(TERM_DETECT_PATH, { text: text.slice(0, MAX_TEXT), known: known.slice(0, 80), ...(ask && { ask: true }) }, { signal, timeout: 30_000 });
    return validateDetected(data);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(MESSAGES[error.response?.status] ?? 'AI가 더 찾지 못했어요. 사전 결과는 그대로 볼 수 있어요.', { cause: error });
  }
}
