/** Mobile section switcher. Panels stay mounted so form drafts survive navigation. */
export default function MobileSectionNav({ label, items, value, onChange }) {
  return <nav className="mts-section-nav" aria-label={label}>{items.map(([id, text]) =>
    <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>
  )}</nav>;
}
