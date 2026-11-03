import { useLayoutEffect, useRef } from 'react';

const groupInteger = value => String(value ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Display grouped integers while passing raw digits to existing form handlers. */
export default function NumberInput({ value, onChange, min, max, step = 1, ...props }) {
  const input = useRef(null);
  const selection = useRef(null);
  const display = groupInteger(value);
  useLayoutEffect(() => {
    const field = input.current;
    const n = Number(value);
    const invalid = value !== '' && value != null && (!Number.isSafeInteger(n)
      || (min != null && n < Number(min)) || (max != null && n > Number(max))
      || (step !== 'any' && (n - Number(min ?? 0)) % Number(step) !== 0));
    field.setCustomValidity(invalid ? '입력 가능한 범위의 정수를 입력해 주세요.' : '');
    if (selection.current != null) {
      const digits = selection.current;
      let position = 0;
      let seen = 0;
      while (position < display.length && seen < digits) {
        if (/\d/.test(display[position])) seen++;
        position++;
      }
      field.setSelectionRange(position, position);
      selection.current = null;
    }
  });
  return <input {...props} ref={input} type="text" inputMode="numeric" value={display}
    onChange={event => {
      const raw = event.target.value.replaceAll(',', '');
      if (!/^\d*$/.test(raw)) return;
      selection.current = event.target.value.slice(0, event.target.selectionStart).replaceAll(',', '').length;
      onChange?.({ target: { value: raw }, currentTarget: { value: raw } });
    }} />;
}
