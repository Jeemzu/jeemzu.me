import type { BudgetData, MonthRef } from '../types';
import type { AllocationResolver, PersonMonthAllocation } from '../lib/allocation';
import type { DepositMode } from '../lib/funding';
import { formatMoney } from '../lib/money';
import { monthLabel } from '../lib/paydays';
import { DataTable } from './DataTable';
import { InfoTip } from './InfoTip';
import { PART_META, TOTAL_META, type BudgetColumn } from './tableFeatures';

interface Props {
  data: BudgetData;
  months: MonthRef[];
  allocationFor: AllocationResolver;
  mode: DepositMode;
}

interface Row {
  month: MonthRef;
  share: PersonMonthAllocation | undefined;
}

function amount(share: PersonMonthAllocation | undefined, pick: (s: PersonMonthAllocation) => number) {
  if (!share?.hasIncome) return '—';
  const cents = pick(share);
  return <span className={cents < 0 ? 'neg' : undefined}>{formatMoney(cents)}</span>;
}

const COLUMNS: BudgetColumn<Row>[] = [
  {
    id: 'month',
    header: 'Month',
    size: 140,
    cell: ({ row: { original: r } }) => monthLabel(r.month),
    enableHiding: false,
  },
  {
    id: 'gross',
    header: 'Gross',
    size: 120,
    meta: { headerTitle: 'Gross pay per paycheck', cellClassName: 'total-cell' },
    cell: ({ row: { original: r } }) => amount(r.share, (s) => s.grossPerPaycheckCents),
  },
  {
    id: 'split',
    header: 'Per paycheck to',
    columns: [
      {
        id: 'autopay',
        header: 'Auto-pay',
        size: 120,
        meta: { ...PART_META, headerTitle: 'Deposited to auto-pay each paycheck' },
        cell: ({ row: { original: r } }) => amount(r.share, (s) => s.autopayPerPaycheckCents),
      },
      {
        id: 'essentials',
        header: 'Essentials',
        size: 120,
        meta: { ...PART_META, headerTitle: 'Deposited to essentials each paycheck' },
        cell: ({ row: { original: r } }) => amount(r.share, (s) => s.essentialsPerPaycheckCents),
      },
      {
        id: 'personal',
        header: 'Personal',
        size: 120,
        meta: { ...TOTAL_META, headerTitle: 'Deposited to the personal account each paycheck' },
        cell: ({ row: { original: r } }) => amount(r.share, (s) => s.personalPerPaycheckCents),
      },
    ],
  },
];

export function PersonalSplitCard({ data, months, allocationFor, mode }: Props) {
  if (data.people.length === 0 || months.length === 0) {
    return (
      <section className="card">
        <h3>Personal paycheck split</h3>
        <p className="muted">Add people and their pay months to see what is left for personal spending.</p>
      </section>
    );
  }

  return (
    <div className="card-row">
      {data.people.map((person, i) => (
        <section key={person.id} className="card">
          <h3>
            Personal paycheck split — {person.name}
            <InfoTip>
              What each paycheck deposits into each account using{' '}
              {mode === 'flat' ? 'flat' : 'monthly minimum'} auto-pay and essentials deposits.
              Personal is whatever is left after those two.
              Locked contributions stay at the specified amount every paycheck; unlocked people
              share the remaining account need proportionally.
            </InfoTip>
          </h3>
          <DataTable
            tableId={`personal-split:${person.id}`}
            data={months.map((month) => ({ month, share: allocationFor(month).people[i] }))}
            columns={COLUMNS}
            getRowId={(r) => `${r.month.year}-${r.month.month}`}
            enableSorting={false}
          />
        </section>
      ))}
    </div>
  );
}
