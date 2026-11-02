const kstTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const kstDay = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short',
});

/** 생성 시각 표시: "11.2(월) 12:40" (KST) */
export function kstStamp(value) {
  const at = new Date(value);
  const part = Object.fromEntries(kstDay.formatToParts(at).map(({ type, value: text }) => [type, text]));
  return `${part.month}.${part.day}(${part.weekday}) ${kstTime.format(at)}`;
}
