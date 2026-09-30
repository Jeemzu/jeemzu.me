import { useMemo } from 'react';
import type { BudgetData, DebtPaymentStrategy, PersonIncome } from '../types';
import { computeProjection, type ProjectionWeek } from '../lib/projection';
import { formatMoney } from '../lib/money';
import { MoneyInput } from './inputs';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';

interface Props {
  data: BudgetData;
  start: Date;
  strategy: DebtPaymentStrategy;
  onUpdatePerson: (id: string, patch: Partial<Omit<PersonIncome, 'id'>>) => void;
  onSetEssentialsBalance: (cents: number) => void;
  onSetAutopayBalance: (cents: number) => void;
}

function fmtISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(y, m - 1, d));
}

function balanceClass(cents: number): string {
  return cents < 0 ? 'total-cell neg' : 'total-cell';
}

function balanceCell(cents: number) {
  return <span className={balanceClass(cents)}>{formatMoney(cents)}</span>;
}

function outflowTotal(week: ProjectionWeek): number {
  return week.outflows.reduce((sum, o) => sum + o.amountCents, 0);
}

export function ProjectionView({ data, start, strategy, onUpdatePerson, onSetEssentialsBalance, onSetAutopayBalance }: Props) {
  const projection = useMemo(() => computeProjection(data, start, 8, strategy), [data, start, strategy]);
  const startLabel = data.projectionStartISO ? `as of ${fmtISO(data.projectionStartISO)}` : 'today';

  const columns: BudgetColumn<ProjectionWeek>[] = [
    {
      id: 'week',
      header: 'Week',
      size: 150,
      accessorFn: (week) => week.startISO,
      cell: ({ row: { original: week } }) => `${fmtISO(week.startISO)} – ${fmtISO(week.endISO)}`,
      enableHiding: false,
    },
    {
      id: 'paydays',
      header: '💰',
      size: 60,
      meta: { headerTitle: 'Wednesday paydays in this week' },
      accessorFn: (week) => week.paydayCount,
      cell: ({ row: { original: week } }) =>
        week.paydayCount === 0 ? (
          ''
        ) : week.incomeKnown ? (
          '💰'
        ) : (
          <span title="No pay schedule for this month, so no deposits are counted.">❓</span>
        ),
    },
    ...projection.people.map(
      (person, i): BudgetColumn<ProjectionWeek> => ({
        id: `person:${person.id}`,
        header: person.name,
        size: 120,
        accessorFn: (week) => week.personal[i].endBalanceCents,
        cell: ({ row: { original: week } }) => balanceCell(week.personal[i].endBalanceCents),
      }),
    ),
    {
      id: 'essentials',
      header: 'Essentials',
      size: 120,
      accessorFn: (week) => week.essentials.endBalanceCents,
      cell: ({ row: { original: week } }) => balanceCell(week.essentials.endBalanceCents),
    },
    {
      id: 'autopay',
      header: 'Auto-pay',
      size: 120,
      accessorFn: (week) => week.autopay.endBalanceCents,
      cell: ({ row: { original: week } }) => balanceCell(week.autopay.endBalanceCents),
    },
    {
      id: 'due',
      header: 'Payments due',
      size: 160,
      accessorFn: outflowTotal,
      cell: ({ row: { original: week } }) => {
        const tooltip = week.outflows
          .map(
            (o) =>
              `${fmtISO(o.dateISO)} · ${o.name} — ${formatMoney(o.amountCents)} (${o.source === 'autopay' ? 'auto-pay' : 'shared'})`,
          )
          .join('\n');
        return (
          <span title={tooltip || 'Nothing due'}>
            {week.outflows.length > 0
              ? `${week.outflows.length} · ${formatMoney(outflowTotal(week))}`
              : '—'}
          </span>
        );
      },
    },
  ];

  const hasAnything = data.people.length > 0 || data.bills.length > 0 || data.debts.length > 0;
  if (!hasAnything) {
    return <p className="muted">Add people, bills, or debts to project account balances.</p>;
  }

  return (
    <div className="projection">
      <div className="balances-row">
        <span className="field-label">Starting balances ({startLabel}):</span>
        {data.people.map((person) => (
          <label key={person.id} className="balance-field">
            {person.name}
            <MoneyInput
              cents={person.personalBalanceCents}
              ariaLabel={`Current balance for ${person.name}`}
              allowNegative
              onCommit={(personalBalanceCents) => onUpdatePerson(person.id, { personalBalanceCents })}
            />
          </label>
        ))}
        <label className="balance-field">
          Essentials
          <MoneyInput
            cents={data.essentialsBalanceCents}
            ariaLabel="Current essentials account balance"
            allowNegative
            onCommit={onSetEssentialsBalance}
          />
        </label>
        <label className="balance-field">
          Auto-pay
          <MoneyInput
            cents={data.autopayBalanceCents}
            ariaLabel="Current auto-pay account balance"
            allowNegative
            onCommit={onSetAutopayBalance}
          />
        </label>
      </div>

      <DataTable
        tableId="projection"
        className="projection-table"
        data={projection.weeks}
        columns={columns}
        getRowId={(week) => week.startISO}
        rowClassName={(week) => (week.incomeKnown ? undefined : 'income-unknown')}
      />
      <p className="muted">
        Balances at the end of each week. Weeks start on payday Wednesdays; the first row covers
        the start date (today unless “Plan from” is set) through the day before the next payday. Each paycheck is carved into auto-pay
        funding, shared essentials, and a personal remainder; every bill and debt drafts from the
        account it's flagged “Paid from”. A ❓ marks a payday in a month with no pay schedule, so
        its deposits are unknown rather than zero. Hover a “Payments due” cell for the item list.
      </p>
    </div>
  );
}
