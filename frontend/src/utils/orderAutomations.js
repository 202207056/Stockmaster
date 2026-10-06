// datetime-local inputs are explicitly interpreted as Korea time, independent of the browser timezone.
export function koreaInput(instant) {
  return new Date(new Date(instant).getTime() + 9 * 3600000).toISOString().slice(0, 16);
}

export function koreaToIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('날짜와 시간을 입력해 주세요.');
  const date = new Date(`${value}:00+09:00`);
  if (!Number.isFinite(date.getTime()) || koreaInput(date) !== value) throw new Error('올바른 날짜와 시간을 입력해 주세요.');
  return date.toISOString();
}

export function automationPayload(form, accountId, code, requestId, now = Date.now()) {
  const quantity = Number(form.quantity);
  if (!accountId || !/^\d{6}$/.test(code)) throw new Error('계좌와 종목을 선택해 주세요.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) throw new Error('수량은 1~1,000,000주 사이 정수여야 합니다.');
  if (!['매수', '매도'].includes(form.side) || !['scheduled', 'condition'].includes(form.kind)) throw new Error('주문 방식을 확인해 주세요.');
  const expires_at = koreaToIso(form.expires);
  if (Date.parse(expires_at) <= now || Date.parse(expires_at) > now + 30 * 86400000) throw new Error('만료는 현재 이후 30일 이내로 입력해 주세요.');
  const payload = { account_id: accountId, symbol_code: code, order_type: form.side, quantity,
    kind: form.kind, expires_at, client_request_id: requestId };
  if (form.kind === 'scheduled') {
    payload.scheduled_at = koreaToIso(form.scheduled);
    if (Date.parse(payload.scheduled_at) <= now || payload.scheduled_at >= expires_at) throw new Error('예약은 현재 이후, 만료 이전이어야 합니다.');
  } else {
    const price = Number(form.trigger);
    if (!Number.isSafeInteger(price) || price < 1 || price > 1000000000 || !['gte', 'lte'].includes(form.operator)) throw new Error('감시 가격과 이상/이하 조건을 확인해 주세요.');
    payload.trigger_price = price;
    payload.trigger_operator = form.operator;
  }
  return payload;
}

export function formatKorea(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}

export function automationStatus(job) {
  return { active: job.kind === 'scheduled' ? '예약대기' : '감시중', executed: '체결', rejected: '거부', expired: '만료', cancelled: '취소' }[job.status] || '확인 필요';
}
