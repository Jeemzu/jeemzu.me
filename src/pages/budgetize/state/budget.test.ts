import { describe, expect, it } from 'vitest';
import { budgetReducer, initialState } from './budget';
import { emptyBudget } from '../types';
import type { BudgetData } from '../types';
import { bill, paidPerson } from '../testFixtures';

function sampleData(): BudgetData {
  return {
    ...emptyBudget(),
    bills: [bill({ id: 'b1', name: 'Rent', amountCents: 120000, dueDay: 1 })],
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

describe('budgetReducer settings actions', () => {
  it('preserves contribution locks when re-importing income for an existing person', () => {
    const person = paidPerson('Alex', 2026, 100, {
      autopayLockedMonthlyCents: 0, essentialsLockedMonthlyCents: 12345,
    });
    const state = budgetReducer({ data: { ...emptyBudget(), people: [person] }, dirty: false }, {
      type: 'import-data', payload: { people: [{ name: 'alex', schedule: [] }] },
    });
    expect(state.data.people[0]).toMatchObject({
      id: person.id, autopayLockedMonthlyCents: 0, essentialsLockedMonthlyCents: 12345,
    });
  });
  it('sets and clears the projection start date', () => {
    const set = budgetReducer(initialState, { type: 'set-projection-start', iso: '2027-01-15' });
    expect(set.data.projectionStartISO).toBe('2027-01-15');
    expect(set.dirty).toBe(true);

    const cleared = budgetReducer(set, { type: 'set-projection-start', iso: null });
    expect(cleared.data.projectionStartISO).toBeNull();
  });

  describe('subscriptions as bills', () => {
    const subscription = bill({
      id: 's1', name: 'Streaming', amountCents: 1500, dueDay: 15, isSubscription: true,
    });

    it('adds, edits, and removes subscriptions using bill actions', () => {
      const added = budgetReducer(initialState, { type: 'add-bill', bill: subscription });
      expect(added.data.bills).toEqual([subscription]);
      expect(added.dirty).toBe(true);

      const updated = budgetReducer(added, {
        type: 'update-bill',
        id: subscription.id,
        patch: { amountCents: 1500, paidFrom: 'autopay' },
      });
      expect(updated.data.bills[0]).toMatchObject({
        isSubscription: true,
        amountCents: 1500,
        paidFrom: 'autopay',
      });

      const withOverride = budgetReducer(updated, {
        type: 'add-override',
        override: {
          id: 'o1', targetKind: 'bill', targetId: subscription.id,
          fromISO: '2027-01-01', toISO: '2027-01-31',
          mode: 'skip', amountCents: null, note: '',
        },
      });
      const removed = budgetReducer(withOverride, { type: 'remove-bill', id: subscription.id });
      expect(removed.data.bills).toEqual([]);
      expect(removed.data.overrides).toEqual([]);
    });

    it('replaces imported monthly bills without deleting subscriptions or their overrides', () => {
      const data: BudgetData = {
        ...sampleData(),
        bills: [...sampleData().bills, subscription],
        overrides: [
          {
            id: 'o1', targetKind: 'bill', targetId: subscription.id,
            fromISO: '2027-01-01', toISO: '2027-01-31',
            mode: 'skip', amountCents: null, note: '',
          },
        ],
      };
      const imported = bill({ id: 'b2', name: 'Electric', amountCents: 5000, dueDay: 1 });
      const state = budgetReducer({ data, dirty: false }, {
        type: 'import-data', payload: { bills: [imported] },
      });
      expect(state.data.bills).toEqual([imported, subscription]);
      expect(state.data.overrides).toEqual(data.overrides);
      expect(state.dirty).toBe(true);
    });
  });

  it('saves the debt strategy with the budget', () => {
    const state = budgetReducer(initialState, { type: 'set-debt-strategy', strategy: 'minimum' });
    expect(state.data.debtStrategy).toBe('minimum');
    expect(state.dirty).toBe(true);
  });
});
