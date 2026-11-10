import { SEED_PRESETS, MAX_SEED_AMOUNT, addSeedAmount, validSeedAmount } from '../../utils/seedAmount';

export default function SeedAmountInput({ id, amount, onChange }) {
  return <div>
    <div className="flex flex-wrap gap-2">{SEED_PRESETS.map(preset => <button key={preset} type="button" disabled={Number(amount || 0) + preset > MAX_SEED_AMOUNT} onClick={() => onChange(addSeedAmount(amount, preset))} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">+{preset.toLocaleString('ko-KR')}원</button>)}</div>
    <label className="mt-5 block text-sm font-bold" htmlFor={id}>직접 입력 (원)</label>
    <input id={id} inputMode="numeric" value={amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} onChange={event => {
      const input = event.target;
      const digitsBeforeCaret = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length;
      const digits = input.value.replace(/,/g, '');
      if (!/^\d*$/.test(digits)) return;
      onChange(digits);
      requestAnimationFrame(() => {
        let caret = 0; let count = 0;
        while (caret < input.value.length && count < digitsBeforeCaret) { if (/\d/.test(input.value[caret])) count++; caret++; }
        input.setSelectionRange(caret, caret);
      });
    }} aria-describedby={`${id}-hint`} aria-invalid={!validSeedAmount(amount)} className="mt-2 w-full rounded-lg border border-gray-300 p-4 text-xl font-bold text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
    <div className="mt-2 flex items-start justify-between gap-3"><p id={`${id}-hint`} className="text-xs leading-6 text-gray-500">10만원~1억원, 원 단위로 입력하세요. 버튼을 누를 때마다 금액이 더해집니다. 1억원을 초과하는 버튼은 비활성화됩니다.</p><button type="button" onClick={() => onChange('0')} className="shrink-0 py-1 text-xs text-gray-500 underline">금액 비우기</button></div>
  </div>;
}
