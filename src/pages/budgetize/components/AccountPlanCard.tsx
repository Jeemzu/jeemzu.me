import type { BudgetData } from '../types';
import type { AccountFunding, AccountMonthPlan, FundingPlan } from '../lib/funding';
import { formatMoney } from '../lib/money';
import { monthLabel } from '../lib/paydays';
import { DataTable } from './DataTable';
import { InfoTip } from './InfoTip';
import { PART_META, TOTAL_META, type BudgetColumn } from './tableFeatures';

interface Props {
  data: BudgetData;
  plan: FundingPlan;
  account: 'autopay' | 'shared';
}

const COPY = {
  autopay: {
    tableId: 'autopay-plan',
    name: 'auto-pay',
    empty: 'Flag bills or debts as paid from auto-pay to size the account.',
  },
  shared: {
    tableId: 'essentials-plan',
    name: 'essentials',
    empty: 'Flag bills or debts as paid from shared to size the essentials account.',
  },
} as const;

function fmtISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}

function money(cents: number) {
  return <span className={cents < 0 ? 'neg' : undefined}>{formatMoney(cents)}</span>;
}

export function AccountPlanCard({ data, plan, account }: Props) {
  const copy = COPY[account];
  const funding: AccountFunding = account === 'autopay' ? plan.autopay : plan.essentials;
  const balanceCents = account === 'autopay' ? data.autopayBalanceCents : data.essentialsBalanceCents;
  const hasCharges = funding.months.some((m) => m.need.totalCents > 0);

  if (plan.months.length === 0) {
    return <p className="muted">Add pay months for each person to plan deposits.</p>;
  }
  if (!hasCharges && funding.openingFundsCents === 0) {
    return <p className="muted">{copy.empty}</p>;
  }

  const incomeCell = (row: AccountMonthPlan, cents: number) => (row.hasIncome ? formatMoney(cents) : '—');

  const columns: BudgetColumn<AccountMonthPlan>[] = [
    {
      id: 'month',
      header: 'Month',
      size: 140,
      cell: ({ row: { original: r } }) => monthLabel(r.month),
      enableHiding: false,
    },
    {
      id: 'paydays',
      header: 'Paydays',
      size: 90,
      meta: { headerTitle: 'Wednesdays from the plan start', cellClassName: 'total-cell' },
      cell: ({ row: { original: r } }) => r.paydayCount,
    },
    {
      id: 'charges',
      header: 'Charges',
      columns: [
        {
          id: 'bills',
          header: 'Bills',
          size: 110,
          meta: PART_META,
          cell: ({ row: { original: r } }) => formatMoney(r.need.billsCents),
        },
        {
          id: 'debts',
          header: 'Debts',
          size: 110,
          meta: PART_META,
          cell: ({ row: { original: r } }) => formatMoney(r.need.debtCents),
        },
        {
          id: 'oneOffs',
          header: 'One-offs',
          size: 110,
          meta: PART_META,
          cell: ({ row: { original: r } }) => formatMoney(r.need.oneOffCents),
        },
        {
          id: 'need',
          header: 'Need',
          size: 120,
          meta: TOTAL_META,
          cell: ({ row: { original: r } }) => formatMoney(r.need.totalCents),
        },
      ],
    },
    {
      id: 'deposit',
      header: 'Deposit / payday',
      columns: [
        {
          id: 'minDeposit',
          header: 'Minimum',
          size: 130,
          meta: {
            ...TOTAL_META,
            headerTitle: 'Smallest deposit each payday that keeps the balance from going negative',
          },
          cell: ({ row: { original: r } }) => incomeCell(r, r.minPerPaydayCents),
        },
        ...data.people.map(
          (person, i): BudgetColumn<AccountMonthPlan> => ({
            id: `person:${person.id}`,
            header: person.name,
            size: 120,
            meta: { ...PART_META, headerTitle: `${person.name}'s share per payday` },
            cell: ({ row: { original: r } }) => incomeCell(r, r.minShares[i] ?? 0),
          }),
        ),
      ],
    },
    {
      id: 'endBalance',
      header: 'End balance',
      size: 130,
      meta: { headerTitle: 'Month-end balance under minimum deposits', cellClassName: 'total-cell' },
      cell: ({ row: { original: r } }) => money(r.endBalanceCents),
    },
  ];

  return (
    <div className="autopay">
      <div className="autopay-hero">
        <span className="stat-label">
          Flat deposit every Wednesday
          <InfoTip>
            The flat amount is split by each person's share of gross pay and keeps the {copy.name}{' '}
            account from going negative through {monthLabel(plan.months[plan.months.length - 1])}.
            Monthly minimums also leave enough to cover the next month's charges before its first
            payday.
          </InfoTip>
        </span>
        <span className="stat-value">{formatMoney(funding.flatPerPaydayCents)}</span>
      </div>
      {data.people.length > 0 && (
        <ul className="autopay-lines">
          {data.people.map((person, i) => (
            <li key={person.id}>
              <span>{person.name}</span>
              <span>{formatMoney(funding.flatShares[i] ?? 0)} / payday</span>
            </li>
          ))}
        </ul>
      )}
      <DataTable
        tableId={copy.tableId}
        data={funding.months}
        columns={columns}
        getRowId={(r) => `${r.month.year}-${r.month.month}`}
        enableSorting={false}
      />
      <div className="autopay-buffer">
        <span className="field-label">
          Opening funds still needed
          <InfoTip>
            On top of the current {formatMoney(balanceCents)} balance, for charges due before the
            first deposit lands (planned from {fmtISO(plan.startISO)}).
          </InfoTip>
        </span>
        <span className="autopay-buffer-amount">{formatMoney(funding.openingFundsCents)}</span>
      </div>
    </div>
  );
}
