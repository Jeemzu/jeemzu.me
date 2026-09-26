import { describe, expect, it } from 'vitest';
import { budgetReducer, initialState } from './budget';
import { emptyBudget } from '../types';
import type { BudgetData } from '../types';

function sampleData(): BudgetData {
  return {
    ...emptyBudget(),
    bills: [
      { id: 'b1', name: 'Rent', amountCents: 120000, dueDay: 1, category: 'Housing', paidFrom: 'shared' },
    ],
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
      bill: { id: 'b1', name: 'Rent', amountCents: 1, dueDay: 1, category: '', paidFrom: 'shared' },
    });

    const saved = budgetReducer(edited, { type: 'mark-saved', data: edited.data });

    expect(saved.dirty).toBe(false);
  });

  it('keeps edits made while a save was in flight marked as unsaved', () => {
    const inFlight = budgetReducer(initialState, {
      type: 'add-bill',
      bill: { id: 'b1', name: 'Rent', amountCents: 1, dueDay: 1, category: '', paidFrom: 'shared' },
    });
    const sentSnapshot = inFlight.data;

    const edited = budgetReducer(inFlight, {
      type: 'add-bill',
      bill: { id: 'b2', name: 'Power', amountCents: 2, dueDay: 5, category: '', paidFrom: 'shared' },
    });
    const afterSave = budgetReducer(edited, { type: 'mark-saved', data: sentSnapshot });

    expect(afterSave.dirty).toBe(true);
    expect(afterSave.data.bills).toHaveLength(2);
  });
});
