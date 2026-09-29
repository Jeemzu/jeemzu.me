import { useState } from 'react';
import type {
  BudgetData,
  DebtPaymentStrategy,
  MonthlyIncome,
  MonthRef,
  PersonIncome,
} from '../types';
import { compareMonthlyIncome, monthlyGrossCents } from '../types';
import { MoneyInput } from './inputs';
import { formatMoney } from '../lib/money';
import { allocateMonth, scheduledMonths } from '../lib/allocation';
import { getPaydays, monthLabel } from '../lib/paydays';

interface Props {
  data: BudgetData;
  strategy: DebtPaymentStrategy;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<PersonIncome, 'id'>>) => void;
  onRemove: (id: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Paycheck counts always come from the Wednesday calendar for hand-entered months. */
function setMonth(
  schedule: MonthlyIncome[],
  ref: MonthRef,
  perPaycheckCents: number,
): MonthlyIncome[] {
  return [
    ...schedule.filter((e) => !(e.year === ref.year && e.month === ref.month)),
    {
      year: ref.year,
      month: ref.month,
      paycheckCount: getPaydays(ref.year, ref.month).length,
      perPaycheckCents,
    },
  ].sort(compareMonthlyIncome);
}

export function PeopleEditor({ data, strategy, onAdd, onUpdate, onRemove }: Props) {
  const { people } = data;
  const months = scheduledMonths(people);
  const now = new Date();
  const [draft, setDraft] = useState<MonthRef>({ year: now.getFullYear(), month: now.getMonth() });

  const addMonth = () => {
    for (const person of people) {
      if (person.schedule.some((e) => e.year === draft.year && e.month === draft.month)) continue;
      onUpdate(person.id, { schedule: setMonth(person.schedule, draft, 0) });
    }
  };

  return (
    <div className="people-editor">
      {people.length === 0 ? (
        <p className="muted">
          Add each person, then import the Gross Income table or enter their pay month by month.
        </p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Current personal balance</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <input
                        className="text-input"
                        value={person.name}
                        aria-label={`Name for ${person.name || 'person'}`}
                        onChange={(e) => onUpdate(person.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <MoneyInput
                        cents={person.personalBalanceCents}
                        allowNegative
                        ariaLabel={`Personal balance for ${person.name}`}
                        onCommit={(personalBalanceCents) =>
                          onUpdate(person.id, { personalBalanceCents })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn danger ghost"
                        title={`Remove ${person.name}`}
                        onClick={() => onRemove(person.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {months.length === 0 ? (
            <p className="muted">No pay months yet — add one below or import the workbook.</p>
          ) : (
            <div className="table-wrap">
              <table className="bills-table schedule-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th title="Wednesdays in the month">Paychecks</th>
                    <th>Person</th>
                    <th>Gross / paycheck</th>
                    <th>Gross / month</th>
                    <th title="Carved out of each paycheck to fund the auto-pay account">
                      Auto-pay
                    </th>
                    <th title="Carved out of each paycheck to fund shared bills">Essentials</th>
                    <th title="What is left of each paycheck">Personal</th>
                  </tr>
                </thead>
                <tbody>
                  {months.flatMap((ref) => {
                    const allocation = allocateMonth(data, ref, strategy);
                    return people.map((person, i) => {
                      const entry = person.schedule.find(
                        (e) => e.year === ref.year && e.month === ref.month,
                      );
                      const share = allocation.people[i];
                      const personal = share?.personalPerPaycheckCents ?? 0;
                      return (
                        <tr key={`${ref.year}-${ref.month}-${person.id}`}>
                          {i === 0 && (
                            <>
                              <td rowSpan={people.length}>{monthLabel(ref)}</td>
                              <td rowSpan={people.length} className="total-cell">
                                {getPaydays(ref.year, ref.month).length}
                              </td>
                            </>
                          )}
                          <td>{person.name}</td>
                          <td>
                            <MoneyInput
                              cents={entry?.perPaycheckCents ?? 0}
                              ariaLabel={`${person.name} gross per paycheck in ${monthLabel(ref)}`}
                              onCommit={(cents) =>
                                onUpdate(person.id, {
                                  schedule: setMonth(person.schedule, ref, cents),
                                })
                              }
                            />
                          </td>
                          <td className="total-cell">
                            {entry ? formatMoney(monthlyGrossCents(entry)) : '—'}
                          </td>
                          <td className="total-cell">
                            {formatMoney(share?.autopayPerPaycheckCents ?? 0)}
                          </td>
                          <td className="total-cell">
                            {formatMoney(share?.essentialsPerPaycheckCents ?? 0)}
                          </td>
                          <td className={`total-cell${personal < 0 ? ' negative' : ''}`}>
                            {formatMoney(personal)}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="schedule-add">
            <label>
              Year
              <input
                className="text-input"
                type="number"
                value={draft.year}
                onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })}
              />
            </label>
            <label>
              Month
              <select
                className="select-input"
                value={draft.month}
                onChange={(e) => setDraft({ ...draft, month: Number(e.target.value) })}
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn" onClick={addMonth}>
              + Add pay month
            </button>
          </div>
        </>
      )}

      <p className="muted">
        Paychecks land every Wednesday, and the count comes from the calendar. Each paycheck is
        carved into auto-pay funding, shared essentials, and whatever is left as personal spending.
        Months with no row stay blank in the projection.
      </p>
      <button type="button" className="btn" onClick={onAdd}>
        + Add person
      </button>
    </div>
  );
}
