import { useMemo } from 'react';
import type { BudgetData, DebtPaymentStrategy } from '../types';
import { findMonthlyIncome } from '../types';
import type { DepositMode } from '../lib/funding';
import { computeProjection, type AccountWeek, type ProjectionDay, type ProjectionOutflow, type ProjectionWeek } from '../lib/projection';
import { formatMoney } from '../lib/money';
import { MoneyInput } from './inputs';
import { DataTable } from './DataTable';
import { PART_META, TOTAL_META, type BudgetColumn } from './tableFeatures';
import { paycheckLock } from '../lib/contributions';

interface CommonProps {
  data: BudgetData;
  start: Date;
  weekCount: number;
  strategy: DebtPaymentStrategy;
  mode: DepositMode;
}

type Props = CommonProps & ({
  personalPersonId?: undefined;
  onSetEssentialsBalance: (cents: number) => void;
  onSetAutopayBalance: (cents: number) => void;
  onSetPersonalBalance?: never;
} | {
  /** Null combines all personal accounts. */
  personalPersonId: string | null;
  onSetPersonalBalance: (id: string, cents: number) => void;
  onSetEssentialsBalance?: never;
  onSetAutopayBalance?: never;
});

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

function accountGroup(
  id: 'essentials' | 'autopay',
  header: string,
  pick: (r: Row) => AccountWeek,
  data: BudgetData,
): BudgetColumn<Row> {
  return {
    id,
    header,
    columns: [
      {
        id: `${id}:in`,
        header: 'In',
        size: 110,
        meta: { ...PART_META, headerTitle: `Paycheck share and one-time income into ${header}` },
        cell: ({ row: { original: r } }) => flowCell(pick(r).depositCents, 'pos'),
      },
      ...data.people.map((person, i): BudgetColumn<Row> => ({
        id: `${id}:person:${person.id}`,
        header: `${person.name}${paycheckLock(person, id === 'autopay' ? 'autopay' : 'shared') !== null ? ' (locked)' : ''}`,
        size: 130,
        meta: { ...PART_META, headerTitle: `${person.name}'s paycheck contribution to ${header}; excludes one-time income` },
        cell: ({ row: { original: r } }) => formatMoney(
          id === 'autopay' ? r.contributions[i].autopayCents : r.contributions[i].essentialsCents),
      })),
      {
        id: `${id}:out`,
        header: 'Out',
        size: 110,
        meta: { ...PART_META, headerTitle: `Bills, debt payments and one-time expenses from ${header}` },
        cell: ({ row: { original: r } }) => flowCell(pick(r).outflowCents, 'neg'),
      },
      {
        id: `${id}:balance`,
        header: 'Balance',
        size: 120,
        meta: TOTAL_META,
        cell: ({ row: { original: r } }) => balanceCell(pick(r).endBalanceCents),
      },
    ],
  };
}

export function ProjectionView({
  data, start, weekCount, strategy, mode, onSetEssentialsBalance, onSetAutopayBalance,
  personalPersonId, onSetPersonalBalance,
}: Props) {
  const projection = useMemo(
    () => computeProjection(data, start, weekCount, strategy, mode),
    [data, start, weekCount, strategy, mode],
  );
  const startLabel = data.projectionStartISO ? `as of ${fmtISO(data.projectionStartISO)}` : 'today';
  const isPersonal = personalPersonId !== undefined;
  const selectedPeople = data.people.flatMap((person, i) =>
    personalPersonId === null || personalPersonId === person.id ? [i] : []);
  const visibleOutflows = (r: Row) => r.outflows.filter((o) =>
    isPersonal
      ? o.source === 'personal' && (personalPersonId === null || o.personId === personalPersonId)
      : o.source !== 'personal');
  const personalAccount = (r: Row): AccountWeek => selectedPeople.reduce((total, i) => ({
    depositCents: total.depositCents + r.personal[i].depositCents,
    outflowCents: total.outflowCents + r.personal[i].outflowCents,
    endBalanceCents: total.endBalanceCents + r.personal[i].endBalanceCents,
  }), { depositCents: 0, outflowCents: 0, endBalanceCents: 0 });
  const personalIncomeKnown = (r: Row) => (r.kind === 'day' ? [r] : r.days).every((day) => {
    if (!day.isPayday) return true;
    const date = parseISO(day.dateISO);
    return selectedPeople.every((i) => findMonthlyIncome(data.people[i], {
      year: date.getFullYear(), month: date.getMonth(),
    }) !== null);
  });
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
    ...(isPersonal ? [
      {
        id: 'personal:in', header: 'In', size: 120,
        meta: { ...PART_META, headerTitle: 'Paycheck remainder after auto-pay and essentials, plus personal deposits' },
        cell: ({ row: { original: r } }) => flowCell(personalAccount(r).depositCents, 'pos'),
      },
      {
        id: 'personal:combined', header: 'Combined plan', size: 130,
        meta: { ...PART_META, headerTitle: 'Proportional withdrawals for combined personal expenses' },
        cell: ({ row: { original: r } }) => flowCell(outflowTotal(
          visibleOutflows(r).filter((o) => o.personalExpenseScope === 'combined')), 'neg'),
      },
      {
        id: 'personal:own', header: 'Own expenses', size: 130,
        meta: { ...PART_META, headerTitle: 'Individual personal expenses, including personal one-time entries' },
        cell: ({ row: { original: r } }) => flowCell(outflowTotal(
          visibleOutflows(r).filter((o) => o.personalExpenseScope !== 'combined')), 'neg'),
      },
      {
        id: 'personal:balance', header: 'Balance', size: 130, meta: TOTAL_META,
        cell: ({ row: { original: r } }) => balanceCell(personalAccount(r).endBalanceCents),
      },
    ] satisfies BudgetColumn<Row>[] : [
      accountGroup('essentials', 'Essentials', (r) => r.essentials, data),
      accountGroup('autopay', 'Auto-pay', (r) => r.autopay, data),
    ]),
    {
      id: 'due',
      header: 'Payments due',
      size: 160,
      cell: ({ row: { original: r } }) => {
        const outflows = visibleOutflows(r);
        const tooltip = outflows
          .map(
            (o) =>
              `${fmtISO(o.dateISO)} · ${o.name} — ${formatMoney(o.amountCents)} (${o.source === 'personal' ? data.people.find((p) => p.id === o.personId)?.name ?? 'personal' : o.source === 'autopay' ? 'auto-pay' : 'shared'})`,
          )
          .join('\n');
        return (
          <span title={tooltip || 'Nothing due'}>
            {outflows.length > 0
              ? `${outflows.length} · ${formatMoney(outflowTotal(outflows))}`
              : '—'}
          </span>
        );
      },
    },
  ];

  const hasAnything = data.people.length > 0 || data.bills.length > 0 || data.debts.length > 0;
  if (isPersonal ? data.people.length === 0 : !hasAnything) {
    return <p className="muted">{isPersonal
      ? 'Add people and their pay months to project personal balances.'
      : 'Add people, bills, or debts to project account balances.'}</p>;
  }

  return (
    <div className="projection">
      <div className="balances-row">
        <span className="field-label">Starting balances ({startLabel}):</span>
        {isPersonal ? selectedPeople.map((i) => (
          <label key={data.people[i].id} className="balance-field">
            {data.people[i].name}
            <MoneyInput
              cents={data.people[i].personalBalanceCents}
              ariaLabel={`Current personal balance for ${data.people[i].name}`}
              allowNegative
              onCommit={(cents) => onSetPersonalBalance(data.people[i].id, cents)}
            />
          </label>
        )) : <><label className="balance-field">
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
        </>}
      </div>

      <DataTable<Row>
        tableId={isPersonal ? `personal-projection:${personalPersonId ?? 'combined'}` : 'projection'}
        className="projection-table"
        data={rows}
        columns={columns}
        getRowId={(r) => (r.kind === 'week' ? r.startISO : `day:${r.dateISO}`)}
        getSubRows={(r) => (r.kind === 'week' ? r.subRows : undefined)}
        rowClassName={(r) =>
          [r.kind === 'day' && 'projection-day',
            (!r.incomeKnown || (isPersonal && !personalIncomeKnown(r))) && 'income-unknown']
            .filter(Boolean)
            .join(' ') || undefined
        }
        enableSorting={false}
      />
    </div>
  );
}
