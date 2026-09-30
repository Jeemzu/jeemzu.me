import { useMemo } from 'react';
import type { BudgetData, DebtPaymentStrategy, MonthRef } from '../types';
import type { MonthAllocation } from '../lib/allocation';
import { createFundedAllocator, type FundingPlan } from '../lib/funding';
import { formatMoney } from '../lib/money';
import { monthLabel } from '../lib/paydays';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';

interface Props {
  data: BudgetData;
  plan: FundingPlan;
  strategy: DebtPaymentStrategy;
}

interface Row {
  month: MonthRef;
  minimum: MonthAllocation;
  flat: MonthAllocation;
}

function personal(allocation: MonthAllocation, i: number) {
  const share = allocation.people[i];
  if (!share?.hasIncome) return '—';
  const cents = share.personalPerPaycheckCents;
  return <span className={cents < 0 ? 'neg' : undefined}>{formatMoney(cents)}</span>;
}

export function PersonalSplitCard({ data, plan, strategy }: Props) {
  const rows = useMemo<Row[]>(() => {
    const minimum = createFundedAllocator(data, plan, 'minimum', strategy);
    const flat = createFundedAllocator(data, plan, 'flat', strategy);
    return plan.months.map((month) => ({ month, minimum: minimum(month), flat: flat(month) }));
  }, [data, plan, strategy]);

  if (data.people.length === 0 || rows.length === 0) {
    return <p className="muted">Add people and their pay months to see what is left for personal spending.</p>;
  }

  const columns: BudgetColumn<Row>[] = [
    {
      id: 'month',
      header: 'Month',
      size: 140,
      cell: ({ row: { original: r } }) => monthLabel(r.month),
      enableHiding: false,
    },
    ...data.people.flatMap((person, i): BudgetColumn<Row>[] => [
      {
        id: `gross:${person.id}`,
        header: `${person.name} gross`,
        size: 130,
        meta: { headerTitle: `${person.name}'s gross per paycheck`, cellClassName: 'total-cell' },
        cell: ({ row: { original: r } }) => {
          const share = r.minimum.people[i];
          return share?.hasIncome ? formatMoney(share.grossPerPaycheckCents) : '—';
        },
      },
      {
        id: `min:${person.id}`,
        header: `${person.name} personal (min)`,
        size: 170,
        meta: {
          headerTitle: 'Left per paycheck after monthly minimum auto-pay and essentials deposits',
          cellClassName: 'total-cell',
        },
        cell: ({ row: { original: r } }) => personal(r.minimum, i),
      },
      {
        id: `flat:${person.id}`,
        header: `${person.name} personal (flat)`,
        size: 170,
        meta: {
          headerTitle: 'Left per paycheck after flat weekly auto-pay and essentials deposits',
          cellClassName: 'total-cell',
        },
        cell: ({ row: { original: r } }) => personal(r.flat, i),
      },
    ]),
  ];

  return (
    <div className="autopay">
      <DataTable
        tableId="personal-split"
        data={rows}
        columns={columns}
        getRowId={(r) => `${r.month.year}-${r.month.month}`}
        enableSorting={false}
      />
      <p className="muted">
        Personal is whatever each paycheck has left after its auto-pay and essentials deposits.
      </p>
    </div>
  );
}
