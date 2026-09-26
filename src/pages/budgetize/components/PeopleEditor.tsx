import type { PersonIncome } from '../types';
import { MoneyInput } from './inputs';
import { formatMoney } from '../lib/money';

interface Props {
  people: PersonIncome[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<PersonIncome, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function PeopleEditor({ people, onAdd, onUpdate, onRemove }: Props) {
  const personalTotal = people.reduce((sum, p) => sum + p.personalPerPaycheckCents, 0);
  const essentialsTotal = people.reduce((sum, p) => sum + p.essentialsPerPaycheckCents, 0);
  return (
    <div className="people-editor">
      {people.length === 0 ? (
        <p className="muted">Add each person and what they deposit per Wednesday paycheck.</p>
      ) : (
        <div className="table-wrap">
          <table className="bills-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Personal / paycheck</th>
                <th>Essentials / paycheck</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>
                    <input
                      className="text-input"
                      value={person.name}
                      aria-label={`Name for ${person.name || 'person'}`}
                      onChange={(e) => onUpdate(person.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <MoneyInput
                      cents={person.personalPerPaycheckCents}
                      ariaLabel={`Personal deposit for ${person.name}`}
                      onCommit={(personalPerPaycheckCents) => onUpdate(person.id, { personalPerPaycheckCents })}
                    />
                  </td>
                  <td>
                    <MoneyInput
                      cents={person.essentialsPerPaycheckCents}
                      ariaLabel={`Essentials deposit for ${person.name}`}
                      onCommit={(essentialsPerPaycheckCents) => onUpdate(person.id, { essentialsPerPaycheckCents })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn danger ghost"
                      title={`Remove ${person.name}`}
                      onClick={() => onRemove(person.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Per payday</td>
                <td className="total-cell">{formatMoney(personalTotal)}</td>
                <td className="total-cell">{formatMoney(essentialsTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="muted">
        Deposits land every Wednesday payday. Essentials is the shared account that pays bills and
        debt.
      </p>
      <button type="button" className="btn" onClick={onAdd}>
        + Add person
      </button>
    </div>
  );
}
