import type {
  Bill,
  DebtAccount,
  ScheduleOverride,
} from '../types';
import { MoneyInput } from './inputs';
import { DataTable } from './DataTable';
import type { BudgetColumn } from './tableFeatures';
import { formatMoney } from '../lib/money';

interface Props {
  overrides: ScheduleOverride[];
  bills: Bill[];
  debts: DebtAccount[];
  onAdd: (override: ScheduleOverride) => void;
  onUpdate: (id: string, patch: Partial<Omit<ScheduleOverride, 'id'>>) => void;
  onRemove: (id: string) => void;
}

/** First and last calendar day of the month containing `iso`. */
function monthBounds(iso: string): { fromISO: string; toISO: string } {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return { fromISO: `${y}-${mm}-01`, toISO: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function OverridesEditor({ overrides, bills, debts, onAdd, onUpdate, onRemove }: Props) {
  const targets = [
    ...bills.map((b) => ({ kind: 'bill' as const, id: b.id, name: b.name, amountCents: b.amountCents })),
    ...debts.map((d) => ({ kind: 'debt' as const, id: d.id, name: d.name, amountCents: d.minPaymentCents })),
  ];

  const add = () => {
    const first = targets[0];
    if (!first) return;
    const { fromISO, toISO } = monthBounds(todayISO());
    onAdd({
      id: crypto.randomUUID(),
      targetKind: first.kind,
      targetId: first.id,
      fromISO,
      toISO,
      mode: 'skip',
      amountCents: null,
      note: '',
    });
  };

  const nameFor = (o: ScheduleOverride) =>
    targets.find((t) => t.kind === o.targetKind && t.id === o.targetId)?.name ?? 'unknown';

  const columns: BudgetColumn<ScheduleOverride>[] = [
    {
      id: 'target',
      header: 'Applies to',
      size: 220,
      accessorFn: (o) => nameFor(o),
      cell: ({ row: { original: o } }) => (
        <select
          className="select-input"
          value={`${o.targetKind}:${o.targetId}`}
          aria-label="Bill or debt this override applies to"
          onChange={(e) => {
            const [targetKind, targetId] = e.target.value.split(':');
            onUpdate(o.id, {
              targetKind: targetKind as 'bill' | 'debt',
              targetId,
            });
          }}
        >
          {targets.map((t) => (
            <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>
              {t.name} ({formatMoney(t.amountCents)})
            </option>
          ))}
        </select>
      ),
      enableHiding: false,
    },
    {
      id: 'from',
      header: 'From',
      size: 150,
      accessorFn: (o) => o.fromISO,
      cell: ({ row: { original: o } }) => (
        <input
          type="date"
          className="text-input"
          value={o.fromISO}
          aria-label={`First date the ${nameFor(o)} override applies`}
          onChange={(e) => onUpdate(o.id, { fromISO: e.target.value })}
        />
      ),
    },
    {
      id: 'to',
      header: 'Through',
      size: 150,
      accessorFn: (o) => o.toISO,
      cell: ({ row: { original: o } }) => (
        <input
          type="date"
          className="text-input"
          value={o.toISO}
          min={o.fromISO}
          aria-label={`Last date the ${nameFor(o)} override applies`}
          onChange={(e) => onUpdate(o.id, { toISO: e.target.value })}
        />
      ),
    },
    {
      id: 'mode',
      header: 'Change',
      size: 200,
      accessorFn: (o) => o.mode,
      cell: ({ row: { original: o } }) => (
        <select
          className="select-input"
          value={o.mode}
          aria-label={`How the ${nameFor(o)} override changes the charge`}
          onChange={(e) => {
            const mode = e.target.value as 'skip' | 'amount';
            onUpdate(o.id, { mode, amountCents: mode === 'amount' ? o.amountCents ?? 0 : null });
          }}
        >
          <option value="skip">Skip it</option>
          <option value="amount">Charge a different amount</option>
        </select>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      size: 150,
      accessorFn: (o) => o.amountCents ?? -1,
      cell: ({ row: { original: o } }) =>
        o.mode === 'amount' ? (
          <MoneyInput
            cents={o.amountCents ?? 0}
            ariaLabel={`Replacement amount for ${nameFor(o)}`}
            onCommit={(amountCents) => onUpdate(o.id, { amountCents })}
          />
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      id: 'note',
      header: 'Why',
      size: 200,
      accessorFn: (o) => o.note,
      cell: ({ row: { original: o } }) => (
        <input
          className="text-input"
          value={o.note}
          placeholder="Optional note"
          aria-label={`Note for the ${nameFor(o)} override`}
          onChange={(e) => onUpdate(o.id, { note: e.target.value })}
        />
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
      cell: ({ row: { original: o } }) => (
        <button
          type="button"
          className="btn danger ghost"
          title={`Remove the ${nameFor(o)} override`}
          onClick={() => onRemove(o.id)}
        >
          ✕
        </button>
      ),
    },
  ];

  return (
    <div className="overrides-editor">
      {targets.length === 0 ? (
        <p className="muted">Add a bill or debt first — overrides adjust an existing one.</p>
      ) : overrides.length === 0 ? (
        <p className="muted">
          No temporary changes. Use these when a bill is paused or costs something different for
          a while — the bill itself stays untouched and picks back up on its own.
        </p>
      ) : (
        <DataTable
          tableId="overrides"
          data={overrides}
          columns={columns}
          getRowId={(o) => o.id}
        />
      )}

      {overrides.length > 1 && (
        <p className="muted override-hint">
          When two overrides cover the same day, the lower one wins.
        </p>
      )}

      <button type="button" className="btn" disabled={targets.length === 0} onClick={add}>
        + Add temporary change
      </button>
    </div>
  );
}
