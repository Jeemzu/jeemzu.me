import type { Bill, BudgetData, DebtAccount, ImportedPerson, PersonIncome } from '../types';
import { emptyBudget } from '../types';

export interface AppState {
  data: BudgetData;
  /** True when edits exist that have not been saved to the server yet. */
  dirty: boolean;
}

export interface ImportPayload {
  bills?: Bill[];
  debts?: DebtAccount[];
  people?: ImportedPerson[];
}

export type Action =
  | { type: 'add-bill'; bill: Bill }
  | { type: 'update-bill'; id: string; patch: Partial<Omit<Bill, 'id'>> }
  | { type: 'remove-bill'; id: string }
  | { type: 'add-debt'; debt: DebtAccount }
  | { type: 'update-debt'; id: string; patch: Partial<Omit<DebtAccount, 'id'>> }
  | { type: 'remove-debt'; id: string }
  | { type: 'add-person'; person: PersonIncome }
  | { type: 'update-person'; id: string; patch: Partial<Omit<PersonIncome, 'id'>> }
  | { type: 'remove-person'; id: string }
  | { type: 'set-essentials-balance'; cents: number }
  | { type: 'set-autopay-balance'; cents: number }
  | { type: 'import-data'; payload: ImportPayload }
  | { type: 'restore'; data: BudgetData }
  /** Data loaded from the server — already saved, so it starts clean. */
  | { type: 'hydrate'; data: BudgetData }
  | { type: 'mark-saved'; data: BudgetData };

export const initialState: AppState = { data: emptyBudget(), dirty: false };

/** Imported people keep the id and balance of an existing person with the same name. */
function mergePeople(current: PersonIncome[], imported: ImportedPerson[]): PersonIncome[] {
  return imported.map((person) => {
    const existing = current.find((p) => p.name.toLowerCase() === person.name.toLowerCase());
    return {
      id: existing?.id ?? crypto.randomUUID(),
      name: person.name,
      personalPerPaycheckCents: person.personalPerPaycheckCents,
      essentialsPerPaycheckCents: person.essentialsPerPaycheckCents,
      personalBalanceCents: existing?.personalBalanceCents ?? 0,
    };
  });
}

export function budgetReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add-bill':
      return { data: { ...state.data, bills: [...state.data.bills, action.bill] }, dirty: true };
    case 'update-bill':
      return {
        data: {
          ...state.data,
          bills: state.data.bills.map((bill) =>
            bill.id === action.id ? { ...bill, ...action.patch } : bill,
          ),
        },
        dirty: true,
      };
    case 'remove-bill':
      return {
        data: { ...state.data, bills: state.data.bills.filter((bill) => bill.id !== action.id) },
        dirty: true,
      };
    case 'add-debt':
      return { data: { ...state.data, debts: [...state.data.debts, action.debt] }, dirty: true };
    case 'update-debt':
      return {
        data: {
          ...state.data,
          debts: state.data.debts.map((debt) =>
            debt.id === action.id ? { ...debt, ...action.patch } : debt,
          ),
        },
        dirty: true,
      };
    case 'remove-debt':
      return {
        data: { ...state.data, debts: state.data.debts.filter((debt) => debt.id !== action.id) },
        dirty: true,
      };
    case 'add-person':
      return { data: { ...state.data, people: [...state.data.people, action.person] }, dirty: true };
    case 'update-person':
      return {
        data: {
          ...state.data,
          people: state.data.people.map((person) =>
            person.id === action.id ? { ...person, ...action.patch } : person,
          ),
        },
        dirty: true,
      };
    case 'remove-person':
      return {
        data: { ...state.data, people: state.data.people.filter((p) => p.id !== action.id) },
        dirty: true,
      };
    case 'set-essentials-balance':
      return { data: { ...state.data, essentialsBalanceCents: action.cents }, dirty: true };
    case 'set-autopay-balance':
      return { data: { ...state.data, autopayBalanceCents: action.cents }, dirty: true };
    case 'import-data':
      return {
        data: {
          ...state.data,
          bills: action.payload.bills ?? state.data.bills,
          debts: action.payload.debts ?? state.data.debts,
          people: action.payload.people
            ? mergePeople(state.data.people, action.payload.people)
            : state.data.people,
        },
        dirty: true,
      };
    case 'restore':
      return { data: action.data, dirty: true };
    case 'hydrate':
      return { data: action.data, dirty: false };
    case 'mark-saved':
      // Edits made while the save was in flight must stay unsaved.
      return state.data === action.data ? { ...state, dirty: false } : state;
  }
}
