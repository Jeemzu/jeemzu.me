import type { CategoryTotal } from '../lib/schedule';
import { formatMoney } from '../lib/money';

interface Props {
  categories: CategoryTotal[];
}

export function CategoryBreakdown({ categories }: Props) {
  if (categories.length === 0) {
    return <p className="muted">No bills yet — the category breakdown will appear here.</p>;
  }
  return (
    <ul className="category-list">
      {categories.map((entry) => (
        <li key={entry.category} className="category-row">
          <div className="category-meta">
            <span className="category-name">{entry.category}</span>
            <span className="category-amount">
              {formatMoney(entry.totalCents)} · {(entry.share * 100).toFixed(0)}%
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(entry.share * 100, 2)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
