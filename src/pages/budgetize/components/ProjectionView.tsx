import { useMemo } from 'react';
import type { BudgetData, DebtPaymentStrategy, PersonIncome } from '../types';
import { computeProjection } from '../lib/projection';
import { formatMoney } from '../lib/money';
import { MoneyInput } from './inputs';

interface Props {
  data: BudgetData;
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

export function ProjectionView({ data, strategy, onUpdatePerson, onSetEssentialsBalance, onSetAutopayBalance }: Props) {
  const projection = useMemo(() => computeProjection(data, new Date(), 8, strategy), [data, strategy]);

  const hasAnything = data.people.length > 0 || data.bills.length > 0 || data.debts.length > 0;
  if (!hasAnything) {
    return <p className="muted">Add people, bills, or debts to project account balances.</p>;
  }

  return (
    <div className="projection">
      <div className="balances-row">
        <span className="field-label">Starting balances (today):</span>
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

      <div className="table-wrap">
        <table className="bills-table projection-table">
          <thead>
            <tr>
              <th>Week</th>
              <th title="Wednesday paydays in this week">💰</th>
              {projection.people.map((person) => (
                <th key={person.id}>{person.name}</th>
              ))}
              <th>Essentials</th>
              <th>Auto-pay</th>
              <th>Payments due</th>
            </tr>
          </thead>
          <tbody>
            {projection.weeks.map((week) => {
              const outflowTotal = week.outflows.reduce((sum, o) => sum + o.amountCents, 0);
              const tooltip = week.outflows
                .map(
                  (o) =>
                    `${fmtISO(o.dateISO)} · ${o.name} — ${formatMoney(o.amountCents)} (${o.source === 'autopay' ? 'auto-pay' : 'shared'})`,
                )
                .join('\n');
              return (
                <tr key={week.startISO}>
                  <td>
                    {fmtISO(week.startISO)} – {fmtISO(week.endISO)}
                  </td>
                  <td>{week.paydayCount > 0 ? '💰' : ''}</td>
                  {week.personal.map((account, i) => (
                    <td key={projection.people[i].id} className={balanceClass(account.endBalanceCents)}>
                      {formatMoney(account.endBalanceCents)}
                    </td>
                  ))}
                  <td className={balanceClass(week.essentials.endBalanceCents)}>
                    {formatMoney(week.essentials.endBalanceCents)}
                  </td>
                  <td className={balanceClass(week.autopay.endBalanceCents)}>
                    {formatMoney(week.autopay.endBalanceCents)}
                  </td>
                  <td title={tooltip || 'Nothing due'}>
                    {week.outflows.length > 0
                      ? `${week.outflows.length} · ${formatMoney(outflowTotal)}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Balances at the end of each week. Weeks start on payday Wednesdays; the first row covers
        today through the day before the next payday. Each payday, auto-pay shares are carved out
        of the essentials deposits; every bill and debt drafts from the account it's flagged
        “Paid from”. Hover a “Payments due” cell for the item list.
      </p>
    </div>
  );
}
