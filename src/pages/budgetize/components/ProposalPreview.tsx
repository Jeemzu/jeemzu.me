import { useMemo } from 'react';
import type { BudgetData, DebtPaymentStrategy } from '../types';
import type { DepositMode } from '../lib/funding';
import type { BudgetOp, BudgetProposal } from '../../../utils/budgetAgentApi';
import { computeProjection } from '../lib/projection';
import { applyProposal } from '../lib/proposal';
import { formatMoney } from '../lib/money';

interface Props {
  data: BudgetData;
  start: Date;
  weekCount: number;
  strategy: DebtPaymentStrategy;
  mode: DepositMode;
  proposal: BudgetProposal;
  onApply: (ops: BudgetOp[]) => void;
  onDiscard: () => void;
}

function fmtISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}

function signed(cents: number): string {
  if (cents === 0) return '—';
  return `${cents > 0 ? '+' : '−'}${formatMoney(Math.abs(cents))}`;
}

/** Plain-language label so the user judges the change, not the op name. */
function describeOp(op: BudgetOp, data: BudgetData): string {
  const billName = (id?: string) => data.bills.find((b) => b.id === id)?.name ?? 'bill';
  const debtName = (id?: string) => data.debts.find((d) => d.id === id)?.name ?? 'debt';
  const personName = (id?: string) => data.people.find((p) => p.id === id)?.name ?? 'person';
  const target = op.targetKind === 'debt' ? debtName(op.targetId) : billName(op.targetId);
  const range = op.fromISO && op.toISO ? `${fmtISO(op.fromISO)} – ${fmtISO(op.toISO)}` : '';

  switch (op.op) {
    case 'add_override':
      return op.mode === 'skip'
        ? `Skip ${target}, ${range}`
        : `Change ${target} to ${formatMoney(op.amountCents ?? 0)}, ${range}`;
    case 'remove_override':
      return 'Remove an existing temporary change';
    case 'add_one_off':
      return `${op.kind === 'income' ? 'Add one-time deposit' : 'Add one-time expense'} "${op.name}" of ${formatMoney(op.amountCents ?? 0)} on ${op.dateISO ? fmtISO(op.dateISO) : ''}`;
    case 'remove_one_off':
      return 'Remove a one-time entry';
    case 'add_bill':
      return `Add bill "${op.name}" of ${formatMoney(op.amountCents ?? 0)} on day ${op.dueDay}`;
    case 'update_bill':
      return `Update ${billName(op.targetId)}`;
    case 'remove_bill':
      return `Delete ${billName(op.targetId)}`;
    case 'update_debt':
      return `Update ${debtName(op.targetId)}`;
    case 'update_person':
      return `Update ${personName(op.targetId)}'s paycheck split`;
    case 'set_balance':
      return `Set the ${op.balanceTarget === 'personal' ? `${personName(op.targetId)} personal` : op.balanceTarget} balance to ${formatMoney(op.amountCents ?? 0)}`;
    default:
      return op.op;
  }
}

export function ProposalPreview({ data, start, weekCount, strategy, mode, proposal, onApply, onDiscard }: Props) {
  // Runs the exact code the Apply button will, so the forecast shown is the one you get.
  const { rows, anyChange } = useMemo(() => {
    const before = computeProjection(data, start, weekCount, strategy, mode);
    const after = computeProjection(applyProposal(data, proposal.ops), start, weekCount, strategy, mode);

    const built = before.weeks.map((week, i) => {
      const nextWeek = after.weeks[i];
      const delta = (pick: (w: typeof week) => number) => pick(nextWeek) - pick(week);
      return {
        startISO: week.startISO,
        essentials: delta((w) => w.essentials.endBalanceCents),
        autopay: delta((w) => w.autopay.endBalanceCents),
        personal: before.people.map(
          (_, p) =>
            (nextWeek.personal[p]?.endBalanceCents ?? 0) - (week.personal[p]?.endBalanceCents ?? 0),
        ),
        after: {
          essentials: nextWeek.essentials.endBalanceCents,
          autopay: nextWeek.autopay.endBalanceCents,
        },
      };
    });

    return {
      rows: built,
      anyChange: built.some(
        (r) => r.essentials !== 0 || r.autopay !== 0 || r.personal.some((v) => v !== 0),
      ),
    };
  }, [data, start, weekCount, strategy, mode, proposal.ops]);

  const people = data.people;

  return (
    <section className="proposal-preview card">
      <h4>Proposed changes</h4>
      <p className="proposal-summary">{proposal.summary}</p>

      <ul className="proposal-ops">
        {proposal.ops.map((op, i) => (
          <li key={`${op.op}-${i}`}>
            <span className="proposal-op-label">{describeOp(op, data)}</span>
            <span className="proposal-op-why">{op.rationale}</span>
          </li>
        ))}
      </ul>

      <h5>Effect on your {weekCount}-week forecast</h5>
      {anyChange ? (
        <table className="proposal-delta">
          <thead>
            <tr>
              <th scope="col">Week of</th>
              {people.map((p) => (
                <th key={p.id} scope="col">
                  {p.name}
                </th>
              ))}
              <th scope="col">Essentials</th>
              <th scope="col">Auto-pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.startISO}>
                <th scope="row">{fmtISO(row.startISO)}</th>
                {row.personal.map((cents, i) => (
                  <td key={people[i]?.id ?? i} className={cents < 0 ? 'neg' : undefined}>
                    {signed(cents)}
                  </td>
                ))}
                <td className={row.essentials < 0 ? 'neg' : undefined}>
                  {signed(row.essentials)}
                  {row.essentials !== 0 && (
                    <span className="proposal-abs"> → {formatMoney(row.after.essentials)}</span>
                  )}
                </td>
                <td className={row.autopay < 0 ? 'neg' : undefined}>
                  {signed(row.autopay)}
                  {row.autopay !== 0 && (
                    <span className="proposal-abs"> → {formatMoney(row.after.autopay)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">
          No change to the next {weekCount} weeks — this affects dates further out.
        </p>
      )}

      <div className="proposal-actions">
        <button type="button" className="btn primary" onClick={() => onApply(proposal.ops)}>
          Apply {proposal.ops.length === 1 ? 'change' : `all ${proposal.ops.length} changes`}
        </button>
        <button type="button" className="btn" onClick={onDiscard}>
          Discard
        </button>
      </div>
      <p className="muted proposal-note">
        Applying only edits your working copy — you still need to save.
      </p>
    </section>
  );
}
