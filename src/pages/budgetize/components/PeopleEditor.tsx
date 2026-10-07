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
import { PART_META, TOTAL_META, type BudgetColumn } from './tableFeatures';
import { paycheckLock } from '../lib/contributions';

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
  onUpdateMany: (updates: { id: string; patch: Partial<Omit<PersonIncome, 'id'>> }[]) => void;
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

export function PeopleEditor({ data, allocationFor, onAdd, onUpdate, onUpdateMany, onRemove }: Props) {
  const { people } = data;
  const months = scheduledMonths(people);
  const now = new Date();
  const [draft, setDraft] = useState<MonthRef>({ year: now.getFullYear(), month: now.getMonth() });

  const addMonth = () => {
    onUpdateMany(people
      .filter((person) => !person.schedule.some((e) => e.year === draft.year && e.month === draft.month))
      .map((person) => ({ id: person.id, patch: { schedule: setMonth(person.schedule, draft, 0) } })));
  };

  const removeMonth = (ref: MonthRef) => {
    if (!window.confirm(`Remove ${monthLabel(ref)} pay for everyone?`)) return;
    onUpdateMany(people.map((person) => ({
      id: person.id,
      patch: { schedule: person.schedule.filter((e) => !(e.year === ref.year && e.month === ref.month)) },
    })));
  };

  const lockColumns: BudgetColumn<PersonIncome>[] = (['autopay', 'shared'] as const).map((account) => {
    const label = account === 'autopay' ? 'Auto-pay' : 'Essentials';
    const field = account === 'autopay' ? 'autopayLockedPerPaycheckCents' : 'essentialsLockedPerPaycheckCents';
    return {
      id: `${account}-lock`,
      header: `${label} per-paycheck lock`,
      size: 220,
      enableSorting: false,
      cell: ({ row: { original: person } }) => {
        const cents = paycheckLock(person, account);
        return (
          <div className="contribution-lock">
            <label>
              <input
                type="checkbox"
                checked={cents !== null}
                aria-label={`Lock ${person.name}'s per-paycheck ${label} contribution`}
                onChange={(event) => {
                  const ref = person.schedule.find((entry) =>
                    entry.year === now.getFullYear() && entry.month === now.getMonth())
                    ?? person.schedule[0];
                  const share = ref ? allocationFor(ref).people.find((p) => p.personId === person.id) : null;
                  const perPayday = account === 'autopay'
                    ? share?.autopayPerPaycheckCents
                    : share?.essentialsPerPaycheckCents;
                  onUpdate(person.id, { [field]: event.target.checked
                    ? (perPayday ?? 0)
                    : null });
                }}
              />
              {cents !== null ? 'Locked' : 'Proportional'}
            </label>
            {cents !== null && (
              <MoneyInput
                cents={cents}
                ariaLabel={`${person.name} locked per-paycheck ${label} contribution`}
                onCommit={(amount) => onUpdate(person.id, { [field]: amount })}
              />
            )}
          </div>
        );
      },
    };
  });

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
    ...lockColumns,
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
      id: 'grossGroup',
      header: 'Gross',
      columns: [
        {
          id: 'gross',
          header: 'Per paycheck',
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
          header: 'Per month',
          size: 130,
          meta: { cellClassName: 'total-cell' },
          cell: ({ row: { original: r } }) =>
            r.entry ? formatMoney(monthlyGrossCents(r.entry)) : '—',
        },
      ],
    },
    {
      id: 'split',
      header: 'Paycheck split',
      columns: [
        {
          id: 'autopay',
          header: 'Auto-pay',
          size: 120,
          meta: { ...PART_META, headerTitle: 'Carved out of each paycheck to fund the auto-pay account' },
          cell: ({ row: { original: r } }) => formatMoney(r.share?.autopayPerPaycheckCents ?? 0),
        },
        {
          id: 'essentials',
          header: 'Essentials',
          size: 120,
          meta: { ...PART_META, headerTitle: 'Carved out of each paycheck to fund shared bills' },
          cell: ({ row: { original: r } }) => formatMoney(r.share?.essentialsPerPaycheckCents ?? 0),
        },
        {
          id: 'personal',
          header: 'Personal',
          size: 120,
          meta: { ...TOTAL_META, headerTitle: 'What is left of each paycheck' },
          cell: ({ row: { original: r } }) => {
            const personal = r.share?.personalPerPaycheckCents ?? 0;
            return <span className={personal < 0 ? 'negative' : undefined}>{formatMoney(personal)}</span>;
          },
        },
      ],
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
      <section className="people-section">
        <div className="people-list">
          <div className="people-section-heading">
            <h4>People</h4>
            <button type="button" className="btn" onClick={onAdd}>
              + Add person
            </button>
          </div>
          <p className="muted">
            Lock either account to the same amount every paycheck. Unlocked people share the
            remaining account need in proportion to their gross income. All contributors remain
            visible in the projection split. Locks apply only in months with entered pay.
          </p>

          {people.length === 0 ? (
            <p className="muted">
              Add each person, then import the Gross Income table or enter their pay month by month.
            </p>
          ) : (
            <DataTable
              tableId="people"
              data={people}
              columns={personColumns}
              getRowId={(person) => person.id}
            />
          )}
        </div>
      </section>

      {people.length > 0 && (
        <section className="people-section schedule-section">
          <div className="people-section-heading schedule-section-heading">
            <h4>Pay schedule</h4>
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
          </div>

          {months.length === 0 ? (
            <p className="muted">No pay months yet — add one above or import the workbook.</p>
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
        </section>
      )}
    </div>
  );
}
