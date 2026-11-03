import { termAliases } from './terms.js';

export const TERM_AI_PATH = '/ai/term-explanations';
export const TERM_AI_TIMEOUT_MS = 15_000;
export const explanationFields = [
  ['definition', '기본 뜻'], ['simpleExplanation', '쉽게 말하면'],
  ['contextExplanation', '이 문맥에서는'], ['example', '예시'], ['cautions', '주의사항'],
];
const normalize = (value) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toUpperCase();

export function exactGlossaryId(text, glossary) {
  const word = normalize(text);
  return Object.keys(glossary).find((id) => normalize(glossary[id].term) === word
    || termAliases(glossary[id]).some((alias) => normalize(alias) === word)) ?? null;
}

export function privacyIssue(value) {
  const text = value.normalize('NFKC');
  if (/(?:https?:\/\/|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|bearer\s|api[_ -]?key|access[_ -]?token|인증\s*토큰\s*[:=]|AIza[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]+\.)/iu.test(text)) return true;
  if (/(?:\d[\s.,-]*){6,}/u.test(text) || /\d[\d,.]*\s*(?:만|억|조)?\s*(?:원|달러|USD|KRW)/iu.test(text)) return true;
  return /(?:(?:계좌\s*번호|주민\s*등록(?:번호)?|전화\s*번호|고객명|성명|이름)\s*[:=]\s*\S|(?:보유\s*(?:금액|수량)|잔고|잔액)\s*[:=]?\s*[+\-\d]|[가-힣]{2,4}님)/u.test(text);
}

export function validateTermRequest(payload) {
  if (!payload || Object.keys(payload).sort().join() !== 'context,contextReviewed,term'
    || !payload.term || Object.keys(payload.term).sort().join() !== 'glossaryId,text'
    || payload.contextReviewed !== true) throw new Error('전송 내용을 확인해 주세요.');
  const { text, glossaryId } = payload.term;
  if (typeof text !== 'string' || !text.trim() || [...text].length > 60 || [...text].some((char) => char.charCodeAt(0) < 32)
    || !/^[\p{L}\p{N} .·%()/-]+$/u.test(text)
    || (glossaryId !== null && (typeof glossaryId !== 'string' || !/^[a-z_]{1,50}$/u.test(glossaryId)))) throw new Error('설명할 단어만 60자 이내로 입력해 주세요.');
  if (typeof payload.context !== 'string' || [...payload.context].length > 240) throw new Error('문맥은 필요한 부분만 240자 이내로 적어 주세요.');
  if (privacyIssue(text + '\n' + payload.context)) throw new Error('이름·계좌·보유 내역·금액·연락처·인증정보를 빼고 다시 확인해 주세요.');
  return payload;
}

export function validateTermResponse(data) {
  const fields = explanationFields.map(([key]) => key);
  const keys = ['requestId', 'source', 'status', 'message', 'cached', ...fields].sort().join();
  if (!data || Object.keys(data).sort().join() !== keys || data.source !== 'gemini'
    || typeof data.requestId !== 'string' || data.requestId.length > 80 || !data.requestId
    || !['explained', 'not_financial', 'needs_context', 'unknown'].includes(data.status)
    || typeof data.cached !== 'boolean' || typeof data.message !== 'string' || data.message.length > 400
    || fields.some((key) => typeof data[key] !== 'string' || [...data[key]].length > 400
      || (data.status === 'explained' ? !data[key].trim() : data[key] !== ''))
    || (data.status !== 'explained' && !data.message.trim())) throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.');
  return data;
}
