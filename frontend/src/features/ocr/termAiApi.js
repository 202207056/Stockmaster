import api, { getToken } from '../../api/client';
import { TERM_AI_PATH, TERM_AI_TIMEOUT_MS, validateTermRequest, validateTermResponse } from './termAiContract';

// No runtime mock and no automatic request. Enable only after backend review/approval.
export const termAiEnabled = import.meta.env.VITE_ENABLE_TERM_AI === 'true';

export function createTermExplainer({ post, token, enabled }) {
  return async (payload, signal) => {
    validateTermRequest(payload);
    if (!enabled) throw new Error('AI 설명 연결이 준비되지 않았습니다. 기존 사전 설명은 계속 이용할 수 있습니다.');
    if (!token()) throw new Error('AI 설명은 로그인한 뒤 요청할 수 있습니다.');
    const session = token();
    try {
      const { data } = await post(TERM_AI_PATH, payload, { signal, timeout: TERM_AI_TIMEOUT_MS });
      signal?.throwIfAborted();
      if (session !== token()) throw new Error('로그인 상태가 바뀌었습니다. 다시 확인해 주세요.');
      return validateTermResponse(data);
    } catch (error) {
      if (signal?.aborted) throw error;
      const status = error.response?.status;
      const messages = {
        401: '로그인이 필요합니다. 다시 로그인해 주세요.', 403: 'AI 설명 요청 권한이 없습니다.',
        404: 'AI 설명 서버가 아직 준비되지 않았습니다.', 413: '전송할 내용이 너무 깁니다.',
        422: '용어와 문맥에서 개인정보를 빼고 입력 내용을 다시 확인해 주세요.',
        429: 'AI 사용량 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.',
        502: 'AI 응답을 안전하게 확인하지 못했습니다. 다시 시도해 주세요.',
        503: 'AI 설명을 잠시 사용할 수 없습니다.', 504: 'AI 응답 시간이 초과됐습니다. 다시 시도해 주세요.',
      };
      if (messages[status]) throw new Error(messages[status], { cause: error });
      if (error.code === 'ECONNABORTED') throw new Error(messages[504], { cause: error });
      if (error.isAxiosError) throw new Error('AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', { cause: error });
      throw error;
    }
  };
}

export const explainTerm = createTermExplainer({ post: (...args) => api.post(...args), token: getToken, enabled: termAiEnabled });
