import { useState } from 'react';
import type {
  BudgetData,
  MonthlyIncome,
  MonthRef,
  PersonIncome,
} from '../types';
import { compareMonthlyIncome, monthlyGrossCents } from '../types';
import { MoneyInput } from './inputs';
import { formatMoney } from '../lib/money';
import { scheduledMonths, type AllocationResolver, type PersonMonthAllocation } from '../lib/allocation';
import { getPaydays, monthLabel } from '../lib/paydays';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';

interface ScheduleRow {
  ref: MonthRef;
  person: PersonIncome;
  personIndex: number;
  entry: MonthlyIncome | undefined;
  share: PersonMonthAllocation | undefined;
}

interface Props {
  data: BudgetData;
  /** Funded allocations, so the split matches the projection's deposit mode. */
  allocationFor: AllocationResolver;
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

export function PeopleEditor({ data, allocationFor, onAdd, onUpdate, onRemove }: Props) {
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

  const removeMonth = (ref: MonthRef) => {
    if (!window.confirm(`Remove ${monthLabel(ref)} pay for everyone?`)) return;
    for (const person of people) {
      onUpdate(person.id, {
        schedule: person.schedule.filter((e) => !(e.year === ref.year && e.month === ref.month)),
      });
    }
  };

  const personColumns: BudgetColumn<PersonIncome>[] = [
    {
      id: 'name',
      header: 'Person',
      size: 200,
      accessorFn: (person) => person.name,
      cell: ({ row: { original: person } }) => (
        <input
          className="text-input"
          value={person.name}
          aria-label={`Name for ${person.name || 'person'}`}
          onChange={(e) => onUpdate(person.id, { name: e.target.value })}
        />
      ),
      enableHiding: false,
    },
    {
      id: 'balance',
      header: 'Current personal balance',
      size: 200,
      accessorFn: (person) => person.personalBalanceCents,
      cell: ({ row: { original: person } }) => (
        <MoneyInput
          cents={person.personalBalanceCents}
          allowNegative
          ariaLabel={`Personal balance for ${person.name}`}
          onCommit={(personalBalanceCents) => onUpdate(person.id, { personalBalanceCents })}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 48,
      meta: { headerAriaLabel: 'Actions' },
      enableSorting: false,
      enableResizing: false,
      enableHiding: false,
      cell: ({ row: { original: person } }) => (
        <button
          type="button"
          className="btn danger ghost"
          title={`Remove ${person.name}`}
          onClick={() => onRemove(person.id)}
        >
          ✕
        </button>
      ),
    },
  ];

  const scheduleRows: ScheduleRow[] = months.flatMap((ref) => {
    const allocation = allocationFor(ref);
    return people.map((person, personIndex) => ({
      ref,
      person,
      personIndex,
      entry: person.schedule.find((e) => e.year === ref.year && e.month === ref.month),
      share: allocation.people[personIndex],
    }));
  });

  const scheduleColumns: BudgetColumn<ScheduleRow>[] = [
    {
      id: 'month',
      header: 'Month',
      size: 140,
      cell: ({ row: { original: r } }) => monthLabel(r.ref),
      enableHiding: false,
    },
    {
      id: 'paychecks',
      header: 'Paychecks',
      size: 100,
      meta: { headerTitle: 'Wednesdays in the month', cellClassName: 'total-cell' },
      cell: ({ row: { original: r } }) => getPaydays(r.ref.year, r.ref.month).length,
    },
    {
      id: 'person',
      header: 'Person',
      size: 140,
      cell: ({ row: { original: r } }) => r.person.name,
    },
    {
      id: 'gross',
      header: 'Gross / paycheck',
      size: 160,
      cell: ({ row: { original: r } }) => (
        <MoneyInput
          cents={r.entry?.perPaycheckCents ?? 0}
          ariaLabel={`${r.person.name} gross per paycheck in ${monthLabel(r.ref)}`}
          onCommit={(cents) =>
            onUpdate(r.person.id, { schedule: setMonth(r.person.schedule, r.ref, cents) })
          }
        />
      ),
    },
    {
      id: 'grossMonth',
      header: 'Gross / month',
      size: 130,
      meta: { cellClassName: 'total-cell' },
      cell: ({ row: { original: r } }) =>
        r.entry ? formatMoney(monthlyGrossCents(r.entry)) : '—',
    },
    {
      id: 'autopay',
      header: 'Auto-pay',
      size: 120,
      meta: {
        headerTitle: 'Carved out of each paycheck to fund the auto-pay account',
        cellClassName: 'total-cell',
      },
      cell: ({ row: { original: r } }) => formatMoney(r.share?.autopayPerPaycheckCents ?? 0),
    },
    {
      id: 'essentials',
      header: 'Essentials',
      size: 120,
      meta: {
        headerTitle: 'Carved out of each paycheck to fund shared bills',
        cellClassName: 'total-cell',
      },
      cell: ({ row: { original: r } }) => formatMoney(r.share?.essentialsPerPaycheckCents ?? 0),
    },
    {
      id: 'personal',
      header: 'Personal',
      size: 120,
      meta: { headerTitle: 'What is left of each paycheck', cellClassName: 'total-cell' },
      cell: ({ row: { original: r } }) => {
        const personal = r.share?.personalPerPaycheckCents ?? 0;
        return <span className={personal < 0 ? 'negative' : undefined}>{formatMoney(personal)}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      size: 48,
      meta: { headerAriaLabel: 'Actions' },
      enableResizing: false,
      enableHiding: false,
      cell: ({ row: { original: r } }) => (
        <button
          type="button"
          className="btn danger ghost"
          title={`Remove ${monthLabel(r.ref)} pay for everyone`}
          onClick={() => removeMonth(r.ref)}
        >
          ✕
        </button>
      ),
    },
  ];

  const monthGroupColumns = new Set(['month', 'paychecks', 'actions']);

  return (
    <div className="people-editor">
      {people.length === 0 ? (
        <p className="muted">
          Add each person, then import the Gross Income table or enter their pay month by month.
        </p>
      ) : (
        <>
          <DataTable
            tableId="people"
            data={people}
            columns={personColumns}
            getRowId={(person) => person.id}
          />

          {months.length === 0 ? (
            <p className="muted">No pay months yet — add one below or import the workbook.</p>
          ) : (
            <DataTable
              tableId="pay-schedule"
              className="schedule-table"
              data={scheduleRows}
              columns={scheduleColumns}
              getRowId={(r) => `${r.ref.year}-${r.ref.month}-${r.person.id}`}
              enableSorting={false}
              getCellRowSpan={(columnId, r) =>
                monthGroupColumns.has(columnId) ? (r.personIndex === 0 ? people.length : 0) : 1
              }
            />
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
