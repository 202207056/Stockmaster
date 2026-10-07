export default function HelpIconButton({ open, ...props }) {
  return <button {...props} type="button" aria-expanded={open}
    className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none font-bold transition ${open
      ? 'border-brand-600 bg-brand-600 text-white'
      : 'border-gray-300 text-gray-400 hover:border-brand-500 hover:text-brand-600'}`}>?</button>;
}
