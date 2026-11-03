import { comma } from '../../utils/format';

export default function PopularStockRow({ stock, compact = false }) {
  const rate = stock.change_rate;
  const valid = Number.isFinite(rate);
  const color = !valid || rate === 0 ? 'text-gray-500' : rate > 0 ? 'text-red-500' : 'text-blue-500';
  return <>
    <span className={`${compact ? '' : 'w-5 '}shrink-0 font-bold text-brand-600`}>{stock.rank}</span>
    <span className={`min-w-0 ${compact ? '' : 'flex-1 '}truncate font-medium text-gray-800`} title={stock.name}>{stock.name}</span>
    <span className={`shrink-0 text-xs font-semibold tabular-nums ${color}`}>
      {valid ? `${rate > 0 ? '+' : ''}${comma(rate, 2)}%` : '—'}
    </span>
  </>;
}
