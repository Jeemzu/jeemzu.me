import type { MonthRef } from '../types';
import type { MonthSummary } from '../lib/schedule';
import { daysInMonth } from '../lib/paydays';
import { formatMoney } from '../lib/money';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  monthRef: MonthRef;
  summary: MonthSummary;
}

export function CalendarView({ monthRef, summary }: Props) {
  const { year, month } = monthRef;
  const total = daysInMonth(year, month);
  const leading = new Date(year, month, 1).getDay();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const paydaySet = new Set(summary.paydays);

  const billsByDay = new Map<number, MonthSummary['scheduled']>();
  for (const item of summary.scheduled) {
    const list = billsByDay.get(item.day) ?? [];
    list.push(item);
    billsByDay.set(item.day, list);
  }
  const cells = [];
  for (let i = 0; i < leading; i++) {
    cells.push(<div key={`blank-${i}`} className="cal-cell blank" />);
  }
  for (let day = 1; day <= total; day++) {
    const isPayday = paydaySet.has(day);
    const isToday = isCurrentMonth && now.getDate() === day;
    const dayBills = billsByDay.get(day) ?? [];
    cells.push(
      <div key={day} className={`cal-cell${isPayday ? ' payday' : ''}${isToday ? ' today' : ''}`}>
        <div className="cal-head">
          <span className="cal-daynum">{day}</span>
          {isPayday && <span className="payday-badge" title="Payday">💰</span>}
        </div>
        <div className="cal-bills">
          {dayBills.map((item) => (
            <span
              key={item.id}
              className={`chip${item.kind === 'debt' ? ' debt' : ''}`}
              title={`${item.kind === 'debt' ? 'Debt payment: ' : ''}${item.name} — ${formatMoney(item.amountCents)}${item.moved ? ` (moved from day ${item.dueDay})` : ''}`}
            >
              <span className="chip-name">{item.moved ? '↳ ' : ''}{item.name}</span>
              <span className="chip-amount">{formatMoney(item.amountCents)}</span>
            </span>
          ))}
        </div>
      </div>,
    );
  }

  return (
    <div className="calendar">
      <div className="cal-weekdays">
        {WEEKDAYS.map((label) => (
          <div key={label} className={`cal-weekday${label === 'Wed' ? ' payday-col' : ''}`}>
            {label}
          </div>
        ))}
      </div>
      <div className="cal-grid">{cells}</div>
    </div>
  );
}
