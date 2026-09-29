import { describe, expect, it } from 'vitest';
import { budgetReducer, initialState } from './budget';
import { emptyBudget, monthlyRecurrence } from '../types';
import type { Bill, BudgetData } from '../types';

function bill(partial: Pick<Bill, 'id' | 'name' | 'amountCents' | 'dueDay'> & Partial<Bill>): Bill {
  return { category: '', paidFrom: 'shared', ...monthlyRecurrence(), ...partial };
}

function sampleData(): BudgetData {
  return {
    ...emptyBudget(),
    bills: [bill({ id: 'b1', name: 'Rent', amountCents: 120000, dueDay: 1, category: 'Housing' })],
  };
}

describe('budgetReducer persistence actions', () => {
  it('hydrate loads server data without marking it unsaved', () => {
    const state = budgetReducer(initialState, { type: 'hydrate', data: sampleData() });

    expect(state.data.bills).toHaveLength(1);
    expect(state.dirty).toBe(false);
  });

  it('restore from a backup file counts as an unsaved change', () => {
    const state = budgetReducer(initialState, { type: 'restore', data: sampleData() });

    expect(state.dirty).toBe(true);
  });

  it('mark-saved clears the flag for the data that was sent', () => {
    const edited = budgetReducer(initialState, {
      type: 'add-bill',
      bill: bill({ id: 'b1', name: 'Rent', amountCents: 1, dueDay: 1 }),
    });

    const saved = budgetReducer(edited, { type: 'mark-saved', data: edited.data });

    expect(saved.dirty).toBe(false);
  });

  it('keeps edits made while a save was in flight marked as unsaved', () => {
    const inFlight = budgetReducer(initialState, {
      type: 'add-bill',
      bill: bill({ id: 'b1', name: 'Rent', amountCents: 1, dueDay: 1 }),
    });
    const sentSnapshot = inFlight.data;

    const edited = budgetReducer(inFlight, {
      type: 'add-bill',
      bill: bill({ id: 'b2', name: 'Power', amountCents: 2, dueDay: 5 }),
    });
    const afterSave = budgetReducer(edited, { type: 'mark-saved', data: sentSnapshot });

    expect(afterSave.dirty).toBe(true);
    expect(afterSave.data.bills).toHaveLength(2);
  });
});
