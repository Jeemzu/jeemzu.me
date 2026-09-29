import type { AccountSource, DebtAccount, DebtPaymentStrategy } from '../types';
import { plannedDebtPaymentCents } from '../types';
import { DayInput, MoneyInput } from './inputs';
import { RecurrenceFields } from './RecurrenceFields';
import { isDayStrided } from '../lib/recurrence';
import { formatMoney } from '../lib/money';

interface Props {
  debts: DebtAccount[];
  strategy: DebtPaymentStrategy;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<DebtAccount, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function DebtsEditor({ debts, strategy, onAdd, onUpdate, onRemove }: Props) {
  const balanceTotal = debts.reduce((sum, d) => sum + d.balanceCents, 0);
  const minTotal = debts.reduce((sum, d) => sum + d.minPaymentCents, 0);
  const plannedTotal = debts.reduce((sum, d) => sum + plannedDebtPaymentCents(d, strategy), 0);
  const plannedHint =
    strategy === 'minimum'
      ? 'Minimum payments (strategy: minimum)'
      : 'Promo payoff amount when a promotion is active, otherwise the minimum';
  return (
    <div className="debts-editor">
      {debts.length === 0 ? (
        <p className="muted">No debt accounts yet. Import your workbook or add one below.</p>
      ) : (
        <div className="table-wrap">
          <table className="bills-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Balance</th>
                <th>Min / mo</th>
                <th title="Has an active promotion">Promo</th>
                <th title="Reference only — no interest math is done with these">Promo ends</th>
                <th title="Reference only">Rate</th>
                <th title="Reference only — the rate once the promotion ends">Rate after</th>
                <th>Suggested / mo</th>
                <th title={plannedHint}>Planned / mo</th>
                <th>Due day</th>
                <th>Repeats</th>
                <th title="Leave blank for no start date">Starts</th>
                <th title="Leave blank for no end date">Ends</th>
                <th title="Which account the payment drafts from">Paid from</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => (
                <tr key={debt.id}>
                  <td>
                    <input
                      className="text-input"
                      value={debt.name}
                      aria-label={`Name for ${debt.name || 'debt'}`}
                      onChange={(e) => onUpdate(debt.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <MoneyInput
                      cents={debt.balanceCents}
                      ariaLabel={`Balance for ${debt.name}`}
                      onCommit={(balanceCents) => onUpdate(debt.id, { balanceCents })}
                    />
                  </td>
                  <td>
                    <MoneyInput
                      cents={debt.minPaymentCents}
                      ariaLabel={`Minimum payment for ${debt.name}`}
                      onCommit={(minPaymentCents) => onUpdate(debt.id, { minPaymentCents })}
                    />
                  </td>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={debt.hasPromotion}
                      aria-label={`Promotion active for ${debt.name}`}
                      onChange={(e) => onUpdate(debt.id, { hasPromotion: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      className="text-input"
                      type="date"
                      value={debt.promoEndISO ?? ''}
                      aria-label={`Promotion end date for ${debt.name}`}
                      onChange={(e) =>
                        onUpdate(debt.id, { promoEndISO: e.target.value || null })
                      }
                    />
                  </td>
                  <td>
                    <RateInput
                      bps={debt.interestRateBps}
                      ariaLabel={`Interest rate for ${debt.name}`}
                      onCommit={(interestRateBps) => onUpdate(debt.id, { interestRateBps })}
                    />
                  </td>
                  <td>
                    <RateInput
                      bps={debt.postPromoRateBps}
                      ariaLabel={`Post-promotion interest rate for ${debt.name}`}
                      onCommit={(postPromoRateBps) => onUpdate(debt.id, { postPromoRateBps })}
                    />
                  </td>
                  <td>
                    <MoneyInput
                      cents={debt.suggestedPaymentCents ?? 0}
                      ariaLabel={`Suggested payment for ${debt.name}`}
                      onCommit={(suggestedPaymentCents) => onUpdate(debt.id, { suggestedPaymentCents })}
                    />
                  </td>
                  <td className="total-cell">{formatMoney(plannedDebtPaymentCents(debt, strategy))}</td>
                  <td>
                    {isDayStrided(debt.frequency) ? (
                      <span className="muted" title="Weekly payments count from their start date instead">
                        —
                      </span>
                    ) : (
                      <DayInput
                        value={debt.dueDay}
                        ariaLabel={`Due day for ${debt.name}`}
                        onCommit={(dueDay) => onUpdate(debt.id, { dueDay })}
                      />
                    )}
                  </td>
                  <RecurrenceFields
                    item={debt}
                    label={debt.name || 'this debt'}
                    onChange={(patch) => onUpdate(debt.id, patch)}
                  />
                  <td>
                    <select
                      className="select-input"
                      value={debt.paidFrom}
                      aria-label={`Account ${debt.name} is paid from`}
                      onChange={(e) => onUpdate(debt.id, { paidFrom: e.target.value as AccountSource })}
                    >
                      <option value="autopay">Auto-pay</option>
                      <option value="shared">Shared</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn danger ghost"
                      title={`Remove ${debt.name}`}
                      onClick={() => onRemove(debt.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="total-cell">{formatMoney(balanceTotal)}</td>
                <td className="total-cell">{formatMoney(minTotal)}</td>
                <td colSpan={5} />
                <td className="total-cell">{formatMoney(plannedTotal)}</td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <button type="button" className="btn" onClick={onAdd}>
        + Add debt account
      </button>
    </div>
  );
}

interface RateInputProps {
  bps: number | null;
  ariaLabel: string;
  onCommit: (bps: number | null) => void;
}

/** Percent text input over a basis-point value; blank clears it. */
function RateInput({ bps, ariaLabel, onCommit }: RateInputProps) {
  return (
    <div className="money-input">
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        defaultValue={bps === null ? '' : String(bps / 100)}
        key={bps ?? 'blank'}
        onBlur={(e) => {
          const text = e.target.value.trim().replace('%', '');
          if (text === '') return onCommit(null);
          const n = Number(text);
          if (Number.isFinite(n) && n >= 0) onCommit(Math.round(n * 100));
          else e.target.value = bps === null ? '' : String(bps / 100);
        }}
      />
      <span aria-hidden="true">%</span>
    </div>
  );
}
