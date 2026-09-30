import { useMemo } from 'react';
import type { BudgetData, DebtPaymentStrategy } from '../types';
import type { DepositMode } from '../lib/funding';
import { computeProjection, type AccountWeek, type ProjectionDay, type ProjectionOutflow, type ProjectionWeek } from '../lib/projection';
import { formatMoney } from '../lib/money';
import { MoneyInput } from './inputs';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';

interface Props {
  data: BudgetData;
  start: Date;
  weekCount: number;
  strategy: DebtPaymentStrategy;
  mode: DepositMode;
  onSetEssentialsBalance: (cents: number) => void;
  onSetAutopayBalance: (cents: number) => void;
}

type DayRow = ProjectionDay & { kind: 'day' };
type WeekRow = ProjectionWeek & { kind: 'week'; subRows: DayRow[] };
type Row = WeekRow | DayRow;

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtISO(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parseISO(iso));
}

function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(
    parseISO(iso),
  );
}

function balanceClass(cents: number): string {
  return cents < 0 ? 'total-cell neg' : 'total-cell';
}

function balanceCell(cents: number) {
  return <span className={balanceClass(cents)}>{formatMoney(cents)}</span>;
}

function outflowTotal(outflows: ProjectionOutflow[]): number {
  return outflows.reduce((sum, o) => sum + o.amountCents, 0);
}

function flowCell(cents: number, className: string) {
  return cents > 0 ? <span className={`total-cell ${className}`}>{formatMoney(cents)}</span> : '—';
}

function accountGroup(id: string, header: string, pick: (r: Row) => AccountWeek): BudgetColumn<Row> {
  return {
    id,
    header,
    meta: { headerClassName: 'acct-start' },
    columns: [
      {
        id: `${id}:in`,
        header: 'In',
        size: 110,
        meta: {
          headerTitle: `Paycheck share and one-time income into ${header}`,
          headerClassName: 'acct-start acct-flow',
          cellClassName: 'acct-start acct-flow',
        },
        cell: ({ row: { original: r } }) => flowCell(pick(r).depositCents, 'pos'),
      },
      {
        id: `${id}:out`,
        header: 'Out',
        size: 110,
        meta: {
          headerTitle: `Bills, debt payments and one-time expenses from ${header}`,
          headerClassName: 'acct-flow',
          cellClassName: 'acct-flow',
        },
        cell: ({ row: { original: r } }) => flowCell(pick(r).outflowCents, 'neg'),
      },
      {
        id: `${id}:balance`,
        header: 'Balance',
        size: 120,
        meta: { headerClassName: 'acct-balance', cellClassName: 'acct-balance' },
        cell: ({ row: { original: r } }) => balanceCell(pick(r).endBalanceCents),
      },
    ],
  };
}

export function ProjectionView({ data, start, weekCount, strategy, mode, onSetEssentialsBalance, onSetAutopayBalance }: Props) {
  const projection = useMemo(
    () => computeProjection(data, start, weekCount, strategy, mode),
    [data, start, weekCount, strategy, mode],
  );
  const startLabel = data.projectionStartISO ? `as of ${fmtISO(data.projectionStartISO)}` : 'today';
  const rows = useMemo<WeekRow[]>(
    () =>
      projection.weeks.map((week) => ({
        ...week,
        kind: 'week',
        subRows: week.days.map((day): DayRow => ({ ...day, kind: 'day' })),
      })),
    [projection],
  );

  const columns: BudgetColumn<Row>[] = [
    {
      id: 'week',
      header: 'Week',
      size: 170,
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === 'day') return fmtDay(r.dateISO);
        const expanded = row.getIsExpanded();
        return (
          <button
            type="button"
            className="row-toggle"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} daily balances for ${fmtISO(r.startISO)} – ${fmtISO(r.endISO)}`}
            onClick={row.getToggleExpandedHandler()}
          >
            <span aria-hidden="true" className="row-toggle-icon">▶</span>
            {`${fmtISO(r.startISO)} – ${fmtISO(r.endISO)}`}
          </button>
        );
      },
      enableHiding: false,
    },
    accountGroup('essentials', 'Essentials', (r) => r.essentials),
    accountGroup('autopay', 'Auto-pay', (r) => r.autopay),
    {
      id: 'due',
      header: 'Payments due',
      size: 160,
      meta: { headerClassName: 'acct-start', cellClassName: 'acct-start' },
      cell: ({ row: { original: r } }) => {
        const tooltip = r.outflows
          .map(
            (o) =>
              `${fmtISO(o.dateISO)} · ${o.name} — ${formatMoney(o.amountCents)} (${o.source === 'autopay' ? 'auto-pay' : 'shared'})`,
          )
          .join('\n');
        return (
          <span title={tooltip || 'Nothing due'}>
            {r.outflows.length > 0
              ? `${r.outflows.length} · ${formatMoney(outflowTotal(r.outflows))}`
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

      <DataTable<Row>
        tableId="projection"
        className="projection-table"
        data={rows}
        columns={columns}
        getRowId={(r) => (r.kind === 'week' ? r.startISO : `day:${r.dateISO}`)}
        getSubRows={(r) => (r.kind === 'week' ? r.subRows : undefined)}
        rowClassName={(r) =>
          [r.kind === 'day' && 'projection-day', !r.incomeKnown && 'income-unknown']
            .filter(Boolean)
            .join(' ') || undefined
        }
        enableSorting={false}
      />
    </div>
  );
}
