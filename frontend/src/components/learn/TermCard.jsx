import { Link } from 'react-router-dom';
import { GLOSSARY } from '../../constants/glossary';

/** Shared definition card for the glossary and term analysis. */
export default function TermCard({ term, categoryLabel, destination, onPickRelated, ref, className = '', beforeDescription, children }) {
  return (
    <article ref={ref} className={`relative flex h-full flex-col rounded-xl border border-gray-200 p-4 transition break-words ${destination ? 'hover:border-brand-400 hover:bg-brand-50/30 focus-within:border-brand-500' : ''} ${className}`}>
      {categoryLabel && <p className="mb-2 text-xs text-gray-500">{categoryLabel}</p>}
      <h3 className="text-sm font-extrabold text-gray-900">{destination ? <Link to={destination.to} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:outline-brand-600">{term.term}<span className="mt-1 block text-xs font-medium text-brand-600">{destination.label} →</span></Link> : term.term}</h3>
      {beforeDescription}
      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{term.desc}</p>
      {term.example && <p className="mt-3 rounded-lg bg-gray-50 p-2 text-xs leading-relaxed text-gray-500">예: {term.example}</p>}
      {onPickRelated && term.related?.length > 0 && <div className="mt-3 flex flex-wrap gap-1">
        {term.related.filter(id => GLOSSARY[id]).map(id => <button key={id} type="button" onClick={() => onPickRelated(id)}
          className="relative z-10 rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500 transition hover:border-brand-400 hover:text-brand-700">{GLOSSARY[id].term}</button>)}
      </div>}
      {children}
    </article>
  );
}
