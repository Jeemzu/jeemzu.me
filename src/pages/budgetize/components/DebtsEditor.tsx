import type { AccountSource, DebtAccount, DebtPaymentStrategy } from '../types';
import { plannedDebtPaymentCents } from '../types';
import { DayInput, MoneyInput } from './inputs';
import { EndDateField, FrequencyField, StartDateField } from './RecurrenceFields';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';
import { isDayStrided } from '../lib/recurrence';
import { formatMoney } from '../lib/money';

interface Props {
  debts: DebtAccount[];
  strategy: DebtPaymentStrategy;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<DebtAccount, 'id'>>) => void;
  onRemove: (id: string) => void;
}

const DEFAULT_HIDDEN = ['promo', 'promoEnd', 'rate', 'rateAfter', 'planned', 'frequency', 'paidFrom'];

export function DebtsEditor({ debts, strategy, onAdd, onUpdate, onRemove }: Props) {
  const balanceTotal = debts.reduce((sum, d) => sum + d.balanceCents, 0);
  const minTotal = debts.reduce((sum, d) => sum + d.minPaymentCents, 0);
  const plannedTotal = debts.reduce((sum, d) => sum + plannedDebtPaymentCents(d, strategy), 0);
  const plannedHint =
    strategy === 'minimum'
      ? 'Minimum payments (strategy: minimum)'
      : 'Promo payoff amount when a promotion is active, otherwise the minimum';

  const columns: BudgetColumn<DebtAccount>[] = [
    {
      id: 'name',
      header: 'Account',
      size: 200,
      accessorFn: (debt) => debt.name,
      cell: ({ row: { original: debt } }) => (
        <input
          className="text-input"
          value={debt.name}
          aria-label={`Name for ${debt.name || 'debt'}`}
          onChange={(e) => onUpdate(debt.id, { name: e.target.value })}
        />
      ),
      footer: 'Total',
      enableHiding: false,
    },
    {
      id: 'balance',
      header: 'Balance',
      size: 150,
      accessorFn: (debt) => debt.balanceCents,
      cell: ({ row: { original: debt } }) => (
        <MoneyInput
          cents={debt.balanceCents}
          ariaLabel={`Balance for ${debt.name}`}
          onCommit={(balanceCents) => onUpdate(debt.id, { balanceCents })}
        />
      ),
      footer: () => <span className="total-cell">{formatMoney(balanceTotal)}</span>,
    },
    {
      id: 'minPayment',
      header: 'Min / mo',
      size: 140,
      accessorFn: (debt) => debt.minPaymentCents,
      cell: ({ row: { original: debt } }) => (
        <MoneyInput
          cents={debt.minPaymentCents}
          ariaLabel={`Minimum payment for ${debt.name}`}
          onCommit={(minPaymentCents) => onUpdate(debt.id, { minPaymentCents })}
        />
      ),
      footer: () => <span className="total-cell">{formatMoney(minTotal)}</span>,
    },
    {
      id: 'promo',
      header: 'Promo',
      size: 80,
      meta: { headerTitle: 'Has an active promotion', cellClassName: 'checkbox-cell' },
      accessorFn: (debt) => (debt.hasPromotion ? 1 : 0),
      cell: ({ row: { original: debt } }) => (
        <input
          type="checkbox"
          checked={debt.hasPromotion}
          aria-label={`Promotion active for ${debt.name}`}
          onChange={(e) => onUpdate(debt.id, { hasPromotion: e.target.checked })}
        />
      ),
    },
    {
      id: 'promoEnd',
      header: 'Promo ends',
      size: 150,
      meta: { headerTitle: 'Reference only — no interest math is done with these' },
      accessorFn: (debt) => debt.promoEndISO ?? '',
      cell: ({ row: { original: debt } }) => (
        <input
          className="text-input"
          type="date"
          value={debt.promoEndISO ?? ''}
          aria-label={`Promotion end date for ${debt.name}`}
          onChange={(e) => onUpdate(debt.id, { promoEndISO: e.target.value || null })}
        />
      ),
    },
    {
      id: 'rate',
      header: 'Rate',
      size: 100,
      meta: { headerTitle: 'Reference only' },
      accessorFn: (debt) => debt.interestRateBps ?? -1,
      cell: ({ row: { original: debt } }) => (
        <RateInput
          bps={debt.interestRateBps}
          ariaLabel={`Interest rate for ${debt.name}`}
          onCommit={(interestRateBps) => onUpdate(debt.id, { interestRateBps })}
        />
      ),
    },
    {
      id: 'rateAfter',
      header: 'Rate after',
      size: 100,
      meta: { headerTitle: 'Reference only — the rate once the promotion ends' },
      accessorFn: (debt) => debt.postPromoRateBps ?? -1,
      cell: ({ row: { original: debt } }) => (
        <RateInput
          bps={debt.postPromoRateBps}
          ariaLabel={`Post-promotion interest rate for ${debt.name}`}
          onCommit={(postPromoRateBps) => onUpdate(debt.id, { postPromoRateBps })}
        />
      ),
    },
    {
      id: 'suggested',
      header: 'Suggested / mo',
      size: 140,
      accessorFn: (debt) => debt.suggestedPaymentCents ?? 0,
      cell: ({ row: { original: debt } }) => (
        <MoneyInput
          cents={debt.suggestedPaymentCents ?? 0}
          ariaLabel={`Suggested payment for ${debt.name}`}
          onCommit={(suggestedPaymentCents) => onUpdate(debt.id, { suggestedPaymentCents })}
        />
      ),
    },
    {
      id: 'planned',
      header: 'Planned / mo',
      size: 130,
      meta: { headerTitle: plannedHint, cellClassName: 'total-cell' },
      accessorFn: (debt) => plannedDebtPaymentCents(debt, strategy),
      cell: ({ row: { original: debt } }) => formatMoney(plannedDebtPaymentCents(debt, strategy)),
      footer: () => <span className="total-cell">{formatMoney(plannedTotal)}</span>,
    },
    {
      id: 'dueDay',
      header: 'Due day',
      size: 100,
      accessorFn: (debt) => (isDayStrided(debt.frequency) ? 0 : debt.dueDay),
      cell: ({ row: { original: debt } }) =>
        isDayStrided(debt.frequency) ? (
          <span className="muted" title="Weekly payments count from their start date instead">
            —
          </span>
        ) : (
          <DayInput
            value={debt.dueDay}
            ariaLabel={`Due day for ${debt.name}`}
            onCommit={(dueDay) => onUpdate(debt.id, { dueDay })}
          />
        ),
    },
    {
      id: 'frequency',
      header: 'Repeats',
      size: 150,
      accessorFn: (debt) => debt.frequency,
      cell: ({ row: { original: debt } }) => (
        <FrequencyField
          item={debt}
          label={debt.name || 'this debt'}
          onChange={(patch) => onUpdate(debt.id, patch)}
        />
      ),
    },
    {
      id: 'start',
      header: 'Starts',
      size: 150,
      meta: { headerTitle: 'Leave blank for no start date' },
      accessorFn: (debt) => debt.startISO ?? '',
      cell: ({ row: { original: debt } }) => (
        <StartDateField
          item={debt}
          label={debt.name || 'this debt'}
          onChange={(patch) => onUpdate(debt.id, patch)}
        />
      ),
    },
    {
      id: 'end',
      header: 'Ends',
      size: 150,
      meta: { headerTitle: 'Leave blank for no end date' },
      accessorFn: (debt) => debt.endISO ?? '',
      cell: ({ row: { original: debt } }) => (
        <EndDateField
          item={debt}
          label={debt.name || 'this debt'}
          onChange={(patch) => onUpdate(debt.id, patch)}
        />
      ),
    },
    {
      id: 'paidFrom',
      header: 'Paid from',
      size: 120,
      meta: { headerTitle: 'Which account the payment drafts from' },
      accessorFn: (debt) => debt.paidFrom,
      cell: ({ row: { original: debt } }) => (
        <select
          className="select-input"
          value={debt.paidFrom}
          aria-label={`Account ${debt.name} is paid from`}
          onChange={(e) => onUpdate(debt.id, { paidFrom: e.target.value as AccountSource })}
        >
          <option value="autopay">Auto-pay</option>
          <option value="shared">Shared</option>
        </select>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 48,
      meta: { headerAriaLabel: 'Actions' },
      enableSorting: false,
      enableResizing: false,
      enableHiding: false,
      cell: ({ row: { original: debt } }) => (
        <button
          type="button"
          className="btn danger ghost"
          title={`Remove ${debt.name}`}
          onClick={() => onRemove(debt.id)}
        >
          ✕
        </button>
      ),
    },
  ];

  return (
    <div className="debts-editor">
      {debts.length === 0 ? (
        <p className="muted">No debt accounts yet. Import your workbook or add one below.</p>
      ) : (
        <DataTable
          tableId="debts"
          data={debts}
          columns={columns}
          getRowId={(debt) => debt.id}
          defaultHidden={DEFAULT_HIDDEN}
        />
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
