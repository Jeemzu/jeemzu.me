import type { AccountSource, Bill } from '../types';
import { DayInput, MoneyInput } from './inputs';
import { RecurrenceFields } from './RecurrenceFields';
import { formatMoney } from '../lib/money';
import { isDayStrided, monthlyEquivalentCents } from '../lib/recurrence';

interface Props {
  bills: Bill[];
  categories: string[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<Bill, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function BillsEditor({ bills, categories, onAdd, onUpdate, onRemove }: Props) {
  // Non-monthly bills are normalized so the total stays comparable month to month.
  const totalCents = bills.reduce(
    (sum, bill) => sum + monthlyEquivalentCents(bill, bill.amountCents),
    0,
  );
  return (
    <div className="bills-editor">
      {bills.length === 0 ? (
        <p className="muted">No bills yet. Import your Excel workbook or add one below.</p>
      ) : (
        <div className="table-wrap">
          <table className="bills-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Monthly amount</th>
                <th>Due day</th>
                <th>Repeats</th>
                <th title="Leave blank for no start date">Starts</th>
                <th title="Leave blank for no end date">Ends</th>
                <th>Category</th>
                <th title="Which account the payment drafts from">Paid from</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td>
                    <input
                      className="text-input"
                      value={bill.name}
                      aria-label={`Name for ${bill.name || 'bill'}`}
                      onChange={(e) => onUpdate(bill.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <MoneyInput
                      cents={bill.amountCents}
                      ariaLabel={`Amount for ${bill.name}`}
                      onCommit={(amountCents) => onUpdate(bill.id, { amountCents })}
                    />
                  </td>
                  <td>
                    {isDayStrided(bill.frequency) ? (
                      <span className="muted" title="Weekly bills count from their start date instead">
                        —
                      </span>
                    ) : (
                      <DayInput
                        value={bill.dueDay}
                        ariaLabel={`Due day for ${bill.name}`}
                        onCommit={(dueDay) => onUpdate(bill.id, { dueDay })}
                      />
                    )}
                  </td>
                  <RecurrenceFields
                    item={bill}
                    label={bill.name || 'this bill'}
                    onChange={(patch) => onUpdate(bill.id, patch)}
                  />
                  <td>
                    <input
                      className="text-input"
                      value={bill.category}
                      list="category-options"
                      placeholder="Uncategorized"
                      aria-label={`Category for ${bill.name}`}
                      onChange={(e) => onUpdate(bill.id, { category: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="select-input"
                      value={bill.paidFrom}
                      aria-label={`Account ${bill.name} is paid from`}
                      onChange={(e) => onUpdate(bill.id, { paidFrom: e.target.value as AccountSource })}
                    >
                      <option value="shared">Shared</option>
                      <option value="autopay">Auto-pay</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn danger ghost"
                      title={`Remove ${bill.name}`}
                      onClick={() => onRemove(bill.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total per month</td>
                <td className="total-cell">{formatMoney(totalCents)}</td>
                <td colSpan={7} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <datalist id="category-options">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <button type="button" className="btn" onClick={onAdd}>
        + Add bill
      </button>
    </div>
  );
}
