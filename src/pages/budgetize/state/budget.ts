import type {
  Bill,
  BudgetData,
  DebtAccount,
  DebtPaymentStrategy,
  ImportedPerson,
  OneOffEvent,
  PersonIncome,
  ScheduleOverride,
} from '../types';
import { compareMonthlyIncome, emptyBudget } from '../types';
import type { BudgetOp } from '../../../utils/budgetAgentApi';
import { applyProposal } from '../lib/proposal';

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
  | { type: 'add-override'; override: ScheduleOverride }
  | { type: 'update-override'; id: string; patch: Partial<Omit<ScheduleOverride, 'id'>> }
  | { type: 'remove-override'; id: string }
  | { type: 'add-one-off'; event: OneOffEvent }
  | { type: 'update-one-off'; id: string; patch: Partial<Omit<OneOffEvent, 'id'>> }
  | { type: 'remove-one-off'; id: string }
  /** Assistant-proposed changes the user reviewed and accepted. */
  | { type: 'apply-proposal'; ops: BudgetOp[] }
  | { type: 'set-essentials-balance'; cents: number }
  | { type: 'set-autopay-balance'; cents: number }
  | { type: 'set-projection-start'; iso: string | null }
  | { type: 'set-debt-strategy'; strategy: DebtPaymentStrategy }
  | { type: 'import-data'; payload: ImportPayload }
  | { type: 'restore'; data: BudgetData }
  /** Data loaded from the server — already saved, so it starts clean. */
  | { type: 'hydrate'; data: BudgetData }
  | { type: 'mark-saved'; data: BudgetData };

export const initialState: AppState = { data: emptyBudget(), dirty: false };

/**
 * Imported people keep the id and balance of an existing person with the same
 * name. Schedule months from the sheet overwrite what is stored; months the
 * sheet does not mention are left alone so hand-entered ones survive a re-import.
 */
function mergePeople(current: PersonIncome[], imported: ImportedPerson[]): PersonIncome[] {
  return imported.map((person) => {
    const existing = current.find((p) => p.name.toLowerCase() === person.name.toLowerCase());
    const schedule = new Map(
      (existing?.schedule ?? []).map((entry) => [`${entry.year}-${entry.month}`, entry]),
    );
    for (const entry of person.schedule) schedule.set(`${entry.year}-${entry.month}`, entry);
    return {
      id: existing?.id ?? crypto.randomUUID(),
      name: person.name,
      schedule: [...schedule.values()].sort(compareMonthlyIncome),
      personalBalanceCents: existing?.personalBalanceCents ?? 0,
    };
  });
}

/** Overrides are meaningless once their target is gone, so they are dropped with it. */
function withoutOverridesFor(
  overrides: ScheduleOverride[],
  targetKind: 'bill' | 'debt',
  targetId: string,
): ScheduleOverride[] {
  return overrides.filter((o) => !(o.targetKind === targetKind && o.targetId === targetId));
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
        data: {
          ...state.data,
          bills: state.data.bills.filter((bill) => bill.id !== action.id),
          overrides: withoutOverridesFor(state.data.overrides, 'bill', action.id),
        },
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
        data: {
          ...state.data,
          debts: state.data.debts.filter((debt) => debt.id !== action.id),
          overrides: withoutOverridesFor(state.data.overrides, 'debt', action.id),
        },
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
        data: {
          ...state.data,
          people: state.data.people.filter((p) => p.id !== action.id),
          oneOffs: state.data.oneOffs.filter((e) => e.personId !== action.id),
        },
        dirty: true,
      };
    case 'add-override':
      return {
        data: { ...state.data, overrides: [...state.data.overrides, action.override] },
        dirty: true,
      };
    case 'update-override':
      return {
        data: {
          ...state.data,
          overrides: state.data.overrides.map((o) =>
            o.id === action.id ? { ...o, ...action.patch } : o,
          ),
        },
        dirty: true,
      };
    case 'remove-override':
      return {
        data: { ...state.data, overrides: state.data.overrides.filter((o) => o.id !== action.id) },
        dirty: true,
      };
    case 'add-one-off':
      return {
        data: { ...state.data, oneOffs: [...state.data.oneOffs, action.event] },
        dirty: true,
      };
    case 'update-one-off':
      return {
        data: {
          ...state.data,
          oneOffs: state.data.oneOffs.map((e) =>
            e.id === action.id ? { ...e, ...action.patch } : e,
          ),
        },
        dirty: true,
      };
    case 'remove-one-off':
      return {
        data: { ...state.data, oneOffs: state.data.oneOffs.filter((e) => e.id !== action.id) },
        dirty: true,
      };
    case 'apply-proposal':
      return { data: applyProposal(state.data, action.ops), dirty: true };
    case 'set-essentials-balance':
      return { data: { ...state.data, essentialsBalanceCents: action.cents }, dirty: true };
    case 'set-autopay-balance':
      return { data: { ...state.data, autopayBalanceCents: action.cents }, dirty: true };
    case 'set-projection-start':
      return { data: { ...state.data, projectionStartISO: action.iso }, dirty: true };
    case 'set-debt-strategy':
      return { data: { ...state.data, debtStrategy: action.strategy }, dirty: true };
    case 'import-data': {
      const bills = action.payload.bills ?? state.data.bills;
      const debts = action.payload.debts ?? state.data.debts;
      const people = action.payload.people
        ? mergePeople(state.data.people, action.payload.people)
        : state.data.people;
      const billIds = new Set(bills.map((b) => b.id));
      const debtIds = new Set(debts.map((d) => d.id));
      const personIds = new Set(people.map((p) => p.id));
      return {
        data: {
          ...state.data,
          bills,
          debts,
          people,
          overrides: state.data.overrides.filter((o) =>
            o.targetKind === 'bill' ? billIds.has(o.targetId) : debtIds.has(o.targetId),
          ),
          oneOffs: state.data.oneOffs.filter((e) => e.personId === null || personIds.has(e.personId)),
        },
        dirty: true,
      };
    }
    case 'restore':
      return { data: action.data, dirty: true };
    case 'hydrate':
      return { data: action.data, dirty: false };
    case 'mark-saved':
      // Edits made while the save was in flight must stay unsaved.
      return state.data === action.data ? { ...state, dirty: false } : state;
  }
}
