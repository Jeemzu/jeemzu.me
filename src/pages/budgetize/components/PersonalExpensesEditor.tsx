import type { PersonalExpense, PersonIncome } from '../types';
import type { AllocationResolver } from '../lib/allocation';
import { personalExpenseShares } from '../lib/personalPlanning';
import { FREQUENCY_LABELS, parseISODate } from '../lib/recurrence';
import { formatMoney } from '../lib/money';
import { toISODate } from '../lib/paydays';
import { DataTable } from './DataTable';
import { MoneyInput } from './inputs';
import type { BudgetColumn } from './tableFeatures';

interface Props {
  expenses: PersonalExpense[];
  people: PersonIncome[];
  personId: string | null;
  start: Date;
  allocationFor: AllocationResolver;
  onAdd: (expense: PersonalExpense) => void;
  onUpdate: (id: string, patch: Partial<Omit<PersonalExpense, 'id'>>) => void;
  onRemove: (id: string) => void;
}

const FREQUENCIES = ['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'] as const;

export function PersonalExpensesEditor({
  expenses, people, personId, start, allocationFor, onAdd, onUpdate, onRemove,
}: Props) {
  const rows = expenses.filter((e) => e.personId === personId);
  const columns: BudgetColumn<PersonalExpense>[] = [
    {
      id: 'name', header: 'Expense', size: 200, accessorFn: (e) => e.name, enableHiding: false,
      cell: ({ row: { original: e } }) => (
        <input className="text-input" value={e.name} aria-label={`Name for ${e.name}`}
          maxLength={200} onChange={(event) => onUpdate(e.id, { name: event.target.value })} />
      ),
    },
    {
      id: 'amount', header: 'Amount', size: 140, accessorFn: (e) => e.amountCents,
      cell: ({ row: { original: e } }) => (
        <MoneyInput cents={e.amountCents} ariaLabel={`Amount for ${e.name}`}
          onCommit={(amountCents) => onUpdate(e.id, { amountCents })} />
      ),
    },
    {
      id: 'date', header: 'First date', size: 150, accessorFn: (e) => e.dateISO,
      cell: ({ row: { original: e } }) => (
        <input type="date" className="text-input" value={e.dateISO}
          aria-label={`First date for ${e.name}`}
          max={e.endISO ?? undefined}
          onChange={(event) => onUpdate(e.id, { dateISO: event.target.value })} />
      ),
    },
    {
      id: 'frequency', header: 'Repeats', size: 140, accessorFn: (e) => e.frequency,
      cell: ({ row: { original: e } }) => (
        <select className="select-input" value={e.frequency}
          aria-label={`How often ${e.name} repeats`}
          onChange={(event) => {
            const frequency = event.target.value as PersonalExpense['frequency'];
            onUpdate(e.id, { frequency, ...(frequency === 'once' ? { endISO: null } : {}) });
          }}>
          {FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {frequency === 'once' ? 'One-time' : FREQUENCY_LABELS[frequency]}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'end', header: 'Ends', size: 150, accessorFn: (e) => e.endISO ?? '',
      cell: ({ row: { original: e } }) => e.frequency === 'once' ? '—' : (
        <input type="date" className="text-input" value={e.endISO ?? ''}
          min={e.dateISO} aria-label={`End date for ${e.name}`}
          onChange={(event) => onUpdate(e.id, { endISO: event.target.value || null })} />
      ),
    },
    ...(personId === null ? people.map((person, i): BudgetColumn<PersonalExpense> => ({
      id: `share:${person.id}`, header: person.name, size: 140,
      meta: { headerTitle: "Share for the first charge month; recurring charges use each occurrence month's paycheck remainders" },
      cell: ({ row: { original: e } }) => {
        const date = parseISODate(e.dateISO);
        if (!date) return '—';
        const shares = personalExpenseShares(e, allocationFor({
          year: date.getFullYear(), month: date.getMonth(),
        }));
        return <span title={shares.incomeKnown ? 'Share after auto-pay and essentials' : 'Unknown income: equal split'}>
          {formatMoney(shares.cents[i])}{!shares.incomeKnown && ' *'}
        </span>;
      },
    })) : []),
    {
      id: 'actions', header: '', size: 48, enableSorting: false, enableHiding: false, enableResizing: false,
      meta: { headerAriaLabel: 'Actions' },
      cell: ({ row: { original: e } }) => (
        <button type="button" className="btn danger ghost" title={`Remove ${e.name}`}
          onClick={() => onRemove(e.id)}>✕</button>
      ),
    },
  ];
  return (
    <div className="oneoffs-editor">
      {rows.length > 0 && (
        <DataTable tableId={`personal-expenses:${personId ?? 'combined'}`} data={rows}
          columns={columns} getRowId={(e) => e.id} />
      )}
      <button type="button" className="btn" disabled={people.length === 0}
        onClick={() => onAdd({
          id: crypto.randomUUID(), name: 'Personal expense', amountCents: 0,
          dateISO: toISODate(start), frequency: 'once', endISO: null, personId,
        })}>
        + Add expense
      </button>
    </div>
  );
}
