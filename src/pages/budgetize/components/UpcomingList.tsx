import type { MonthRef } from '../types';
import type { MonthSummary } from '../lib/schedule';
import { formatMoney } from '../lib/money';
import { formatMonthDay } from '../lib/paydays';

interface Props {
  monthRef: MonthRef;
  summary: MonthSummary;
  /** Everyone's combined deposits landing each payday. */
  paydayDepositCents: number;
}

type Item =
  | { kind: 'payday'; day: number; key: string }
  | {
      kind: 'bill' | 'debt' | 'one-off';
      day: number;
      key: string;
      name: string;
      amountCents: number;
      moved: boolean;
      fromDay: number;
      adjusted: boolean;
    };

export function UpcomingList({ monthRef, summary, paydayDepositCents }: Props) {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === monthRef.year && now.getMonth() === monthRef.month;
  const today = now.getDate();

  const items: Item[] = [
    ...summary.paydays.map((day): Item => ({ kind: 'payday', day, key: `payday-${day}` })),
    ...summary.scheduled.map(
      (s): Item => ({
        kind: s.kind,
        day: s.day,
        key: `${s.kind}-${s.id}-${s.dateISO}`,
        name: s.name,
        amountCents: s.amountCents,
        moved: s.moved,
        fromDay: s.dueDay,
        adjusted: s.adjusted,
      }),
    ),
  ].sort((a, b) => a.day - b.day || (a.kind === 'payday' ? -1 : 1) - (b.kind === 'payday' ? -1 : 1));

  if (items.length === 0) {
    return <p className="muted">Add bills or income to see this month's schedule.</p>;
  }

  return (
    <ul className="upcoming">
      {items.map((item) => {
        const past = isCurrentMonth && item.day < today;
        const isToday = isCurrentMonth && item.day === today;
        return (
          <li
            key={item.key}
            className={`upcoming-item ${item.kind}${past ? ' past' : ''}${isToday ? ' today' : ''}`}
          >
            <span className="upcoming-date">{formatMonthDay(monthRef, item.day)}</span>
            {item.kind === 'payday' ? (
              <>
                <span className="upcoming-name">💰 Payday</span>
                <span className="upcoming-amount income">+{formatMoney(paydayDepositCents)}</span>
              </>
            ) : (
              <>
                <span className="upcoming-name">
                  {item.kind === 'debt' ? '💳 ' : ''}
                  {item.kind === 'one-off' ? '✦ ' : ''}
                  {item.name}
                  {item.moved && (
                    <span className="moved-note" title={`Moved from day ${item.fromDay} (short month)`}>
                      {' '}↳ from {item.fromDay}
                    </span>
                  )}
                  {item.adjusted && (
                    <span className="moved-note" title="A schedule override changed this amount">
                      {' '}· adjusted
                    </span>
                  )}
                </span>
                <span className="upcoming-amount">−{formatMoney(item.amountCents)}</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
