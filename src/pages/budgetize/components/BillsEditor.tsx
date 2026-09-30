import type { AccountSource, Bill } from '../types';
import { DayInput, MoneyInput } from './inputs';
import { EndDateField, FrequencyField, StartDateField } from './RecurrenceFields';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';
import { formatMoney } from '../lib/money';
import { isDayStrided, monthlyEquivalentCents } from '../lib/recurrence';

interface Props {
  bills: Bill[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<Bill, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function BillsEditor({ bills, onAdd, onUpdate, onRemove }: Props) {
  // Non-monthly bills are normalized so the total stays comparable month to month.
  const totalCents = bills.reduce(
    (sum, bill) => sum + monthlyEquivalentCents(bill, bill.amountCents),
    0,
  );

  const columns: BudgetColumn<Bill>[] = [
    {
      id: 'name',
      header: 'Bill',
      size: 200,
      accessorFn: (bill) => bill.name,
      cell: ({ row: { original: bill } }) => (
        <input
          className="text-input"
          value={bill.name}
          aria-label={`Name for ${bill.name || 'bill'}`}
          onChange={(e) => onUpdate(bill.id, { name: e.target.value })}
        />
      ),
      footer: 'Total per month',
      enableHiding: false,
    },
    {
      id: 'amount',
      header: 'Monthly amount',
      size: 150,
      accessorFn: (bill) => bill.amountCents,
      cell: ({ row: { original: bill } }) => (
        <MoneyInput
          cents={bill.amountCents}
          ariaLabel={`Amount for ${bill.name}`}
          onCommit={(amountCents) => onUpdate(bill.id, { amountCents })}
        />
      ),
      footer: () => <span className="total-cell">{formatMoney(totalCents)}</span>,
    },
    {
      id: 'dueDay',
      header: 'Due day',
      size: 100,
      accessorFn: (bill) => (isDayStrided(bill.frequency) ? 0 : bill.dueDay),
      cell: ({ row: { original: bill } }) =>
        isDayStrided(bill.frequency) ? (
          <span className="muted" title="Weekly bills count from their start date instead">
            —
          </span>
        ) : (
          <DayInput
            value={bill.dueDay}
            ariaLabel={`Due day for ${bill.name}`}
            onCommit={(dueDay) => onUpdate(bill.id, { dueDay })}
          />
        ),
    },
    {
      id: 'frequency',
      header: 'Repeats',
      size: 150,
      accessorFn: (bill) => bill.frequency,
      cell: ({ row: { original: bill } }) => (
        <FrequencyField
          item={bill}
          label={bill.name || 'this bill'}
          onChange={(patch) => onUpdate(bill.id, patch)}
        />
      ),
    },
    {
      id: 'start',
      header: 'Starts',
      size: 150,
      meta: { headerTitle: 'Leave blank for no start date' },
      accessorFn: (bill) => bill.startISO ?? '',
      cell: ({ row: { original: bill } }) => (
        <StartDateField
          item={bill}
          label={bill.name || 'this bill'}
          onChange={(patch) => onUpdate(bill.id, patch)}
        />
      ),
    },
    {
      id: 'end',
      header: 'Ends',
      size: 150,
      meta: { headerTitle: 'Leave blank for no end date' },
      accessorFn: (bill) => bill.endISO ?? '',
      cell: ({ row: { original: bill } }) => (
        <EndDateField
          item={bill}
          label={bill.name || 'this bill'}
          onChange={(patch) => onUpdate(bill.id, patch)}
        />
      ),
    },
    {
      id: 'paidFrom',
      header: 'Paid from',
      size: 120,
      meta: { headerTitle: 'Which account the payment drafts from' },
      accessorFn: (bill) => bill.paidFrom,
      cell: ({ row: { original: bill } }) => (
        <select
          className="select-input"
          value={bill.paidFrom}
          aria-label={`Account ${bill.name} is paid from`}
          onChange={(e) => onUpdate(bill.id, { paidFrom: e.target.value as AccountSource })}
        >
          <option value="shared">Shared</option>
          <option value="autopay">Auto-pay</option>
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
      cell: ({ row: { original: bill } }) => (
        <button
          type="button"
          className="btn danger ghost"
          title={`Remove ${bill.name}`}
          onClick={() => onRemove(bill.id)}
        >
          ✕
        </button>
      ),
    },
  ];

  return (
    <div className="bills-editor">
      {bills.length === 0 ? (
        <p className="muted">No bills yet. Import your Excel workbook or add one below.</p>
      ) : (
        <DataTable tableId="bills" data={bills} columns={columns} getRowId={(bill) => bill.id} />
      )}
      <button type="button" className="btn" onClick={onAdd}>
        + Add bill
      </button>
    </div>
  );
}
