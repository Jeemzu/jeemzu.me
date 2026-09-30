import type { BudgetData, MonthRef } from '../types';
import type { AllocationResolver, PersonMonthAllocation } from '../lib/allocation';
import { formatMoney } from '../lib/money';
import { monthLabel } from '../lib/paydays';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';

interface Props {
  data: BudgetData;
  months: MonthRef[];
  allocationFor: AllocationResolver;
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
    id: 'autopay',
    header: '− Auto-pay',
    size: 120,
    meta: { headerTitle: 'Deposited to auto-pay each paycheck', cellClassName: 'total-cell' },
    cell: ({ row: { original: r } }) => amount(r.share, (s) => s.autopayPerPaycheckCents),
  },
  {
    id: 'essentials',
    header: '− Essentials',
    size: 120,
    meta: { headerTitle: 'Deposited to essentials each paycheck', cellClassName: 'total-cell' },
    cell: ({ row: { original: r } }) => amount(r.share, (s) => s.essentialsPerPaycheckCents),
  },
  {
    id: 'personal',
    header: '= Personal',
    size: 120,
    meta: { headerTitle: 'Deposited to the personal account each paycheck', cellClassName: 'total-cell' },
    cell: ({ row: { original: r } }) => amount(r.share, (s) => s.personalPerPaycheckCents),
  },
];

export function PersonalSplitCard({ data, months, allocationFor }: Props) {
  if (data.people.length === 0 || months.length === 0) {
    return <p className="muted">Add people and their pay months to see what is left for personal spending.</p>;
  }

  return (
    <div className="autopay">
      {data.people.map((person, i) => (
        <div key={person.id}>
          <h4 className="personal-split-name">{person.name}</h4>
          <DataTable
            tableId={`personal-split:${person.id}`}
            data={months.map((month) => ({ month, share: allocationFor(month).people[i] }))}
            columns={COLUMNS}
            getRowId={(r) => `${r.month.year}-${r.month.month}`}
            enableSorting={false}
          />
        </div>
      ))}
    </div>
  );
}
