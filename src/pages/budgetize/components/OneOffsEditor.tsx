import type { OneOffAccount, OneOffEvent, PersonIncome } from '../types';
import { MoneyInput } from './inputs';

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

  return (
    <div className="oneoffs-editor">
      {oneOffs.length === 0 ? (
        <p className="muted">
          Nothing one-time scheduled. Use these for a single expense or deposit that
          doesn&apos;t repeat — a car repair, a bonus, a tax refund.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="bills-table">
            <thead>
              <tr>
                <th>What</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th title="Which account the money moves through">Account</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {oneOffs.map((e) => (
                <tr key={e.id}>
                  <td>
                    <input
                      className="text-input"
                      value={e.name}
                      aria-label={`Name for ${e.name || 'one-time entry'}`}
                      onChange={(ev) => onUpdate(e.id, { name: ev.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="select-input"
                      value={e.kind}
                      aria-label={`Whether ${e.name} is money in or out`}
                      onChange={(ev) =>
                        onUpdate(e.id, { kind: ev.target.value as 'expense' | 'income' })
                      }
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Deposit</option>
                    </select>
                  </td>
                  <td>
                    <MoneyInput
                      cents={e.amountCents}
                      ariaLabel={`Amount for ${e.name}`}
                      onCommit={(amountCents) => onUpdate(e.id, { amountCents })}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      className="text-input"
                      value={e.dateISO}
                      aria-label={`Date for ${e.name}`}
                      onChange={(ev) => onUpdate(e.id, { dateISO: ev.target.value })}
                    />
                  </td>
                  <td>
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
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn danger ghost"
                      title={`Remove ${e.name}`}
                      onClick={() => onRemove(e.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" className="btn" onClick={add}>
        + Add one-time entry
      </button>
    </div>
  );
}
