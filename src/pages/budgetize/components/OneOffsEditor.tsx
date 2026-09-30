import type { OneOffAccount, OneOffEvent, PersonIncome } from '../types';
import { MoneyInput } from './inputs';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';

interface Props {
  oneOffs: OneOffEvent[];
  people: PersonIncome[];
  onAdd: (event: OneOffEvent) => void;
  onUpdate: (id: string, patch: Partial<Omit<OneOffEvent, 'id'>>) => void;
  onRemove: (id: string) => void;
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function OneOffsEditor({ oneOffs, people, onAdd, onUpdate, onRemove }: Props) {
  const add = () =>
    onAdd({
      id: crypto.randomUUID(),
      kind: 'expense',
      name: 'One-time expense',
      amountCents: 0,
      dateISO: todayISO(),
      account: 'shared',
      personId: null,
      note: '',
    });

  const columns: BudgetColumn<OneOffEvent>[] = [
    {
      id: 'name',
      header: 'What',
      size: 200,
      accessorFn: (e) => e.name,
      cell: ({ row: { original: e } }) => (
        <input
          className="text-input"
          value={e.name}
          aria-label={`Name for ${e.name || 'one-time entry'}`}
          onChange={(ev) => onUpdate(e.id, { name: ev.target.value })}
        />
      ),
      enableHiding: false,
    },
    {
      id: 'kind',
      header: 'Type',
      size: 120,
      accessorFn: (e) => e.kind,
      cell: ({ row: { original: e } }) => (
        <select
          className="select-input"
          value={e.kind}
          aria-label={`Whether ${e.name} is money in or out`}
          onChange={(ev) => onUpdate(e.id, { kind: ev.target.value as 'expense' | 'income' })}
        >
          <option value="expense">Expense</option>
          <option value="income">Deposit</option>
        </select>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      size: 150,
      accessorFn: (e) => e.amountCents,
      cell: ({ row: { original: e } }) => (
        <MoneyInput
          cents={e.amountCents}
          ariaLabel={`Amount for ${e.name}`}
          onCommit={(amountCents) => onUpdate(e.id, { amountCents })}
        />
      ),
    },
    {
      id: 'date',
      header: 'Date',
      size: 150,
      accessorFn: (e) => e.dateISO,
      cell: ({ row: { original: e } }) => (
        <input
          type="date"
          className="text-input"
          value={e.dateISO}
          aria-label={`Date for ${e.name}`}
          onChange={(ev) => onUpdate(e.id, { dateISO: ev.target.value })}
        />
      ),
    },
    {
      id: 'account',
      header: 'Account',
      size: 180,
      meta: { headerTitle: 'Which account the money moves through' },
      accessorFn: (e) =>
        e.account === 'personal'
          ? (people.find((p) => p.id === e.personId)?.name ?? '')
          : e.account,
      cell: ({ row: { original: e } }) => (
        <select
          className="select-input"
          value={e.account === 'personal' ? `personal:${e.personId ?? ''}` : e.account}
          aria-label={`Account for ${e.name}`}
          onChange={(ev) => {
            const value = ev.target.value;
            if (value.startsWith('personal:')) {
              onUpdate(e.id, {
                account: 'personal',
                personId: value.slice('personal:'.length),
              });
            } else {
              onUpdate(e.id, { account: value as OneOffAccount, personId: null });
            }
          }}
        >
          <option value="shared">Shared essentials</option>
          <option value="autopay">Auto-pay</option>
          {people.map((p) => (
            <option key={p.id} value={`personal:${p.id}`}>
              {p.name} (personal)
            </option>
          ))}
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
      cell: ({ row: { original: e } }) => (
        <button
          type="button"
          className="btn danger ghost"
          title={`Remove ${e.name}`}
          onClick={() => onRemove(e.id)}
        >
          ✕
        </button>
      ),
    },
  ];

  return (
    <div className="oneoffs-editor">
      {oneOffs.length === 0 ? (
        <p className="muted">
          Nothing one-time scheduled. Use these for a single expense or deposit that
          doesn&apos;t repeat — a car repair, a bonus, a tax refund.
        </p>
      ) : (
        <DataTable tableId="one-offs" data={oneOffs} columns={columns} getRowId={(e) => e.id} />
      )}

      <button type="button" className="btn" onClick={add}>
        + Add one-time entry
      </button>
    </div>
  );
}
