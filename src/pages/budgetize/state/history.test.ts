import { describe, expect, it } from 'vitest';
import { budgetHistoryReducer as reduce, initialHistoryState } from './history';
import { bill, paidPerson } from '../testFixtures';
import { emptyBudget } from '../types';

const data = { ...emptyBudget(), bills: [bill({ name: 'Rent', amountCents: 100, dueDay: 1 })] };
const loaded = () => reduce(initialHistoryState, { type: 'hydrate', data });

describe('budget undo history', () => {
  it('undoes and redoes a committed field edit', () => {
    const edited = reduce(loaded(), { type: 'update-bill', id: 'Rent', patch: { amountCents: 200 } });
    const undone = reduce(edited, { type: 'undo' });
    expect(undone.data).toEqual(data);
    expect(undone.dirty).toBe(false);
    const redone = reduce(undone, { type: 'redo' });
    expect(redone.data.bills[0].amountCents).toBe(200);
    expect(redone.dirty).toBe(true);
  });

  it('groups typing in a focused field and ignores unchanged commits', () => {
    let state = reduce(loaded(), { type: 'begin-edit' });
    for (const name of ['R', 'Re', 'Ren', 'Rental']) {
      state = reduce(state, { type: 'update-bill', id: 'Rent', patch: { name } });
    }
    state = reduce(state, { type: 'end-edit' });
    state = reduce(state, { type: 'update-bill', id: 'Rent', patch: { name: 'Rental' } });
    expect(state.past).toHaveLength(1);
    expect(reduce(state, { type: 'undo' }).data).toEqual(data);
  });

  it('keeps history across saves and compares undo/redo against the saved snapshot', () => {
    const edited = reduce(loaded(), { type: 'remove-bill', id: 'Rent' });
    const saved = reduce(edited, { type: 'mark-saved', data: edited.data });
    const undone = reduce(saved, { type: 'undo' });
    expect(undone.dirty).toBe(true);
    expect(reduce(undone, { type: 'redo' }).dirty).toBe(false);
    const pendingEdit = reduce(saved, { type: 'set-autopay-balance', cents: 10 });
    expect(reduce(pendingEdit, { type: 'mark-saved', data: saved.data }).dirty).toBe(true);
  });

  it('clears redo after a new edit and history after hydration', () => {
    const edited = reduce(loaded(), { type: 'remove-bill', id: 'Rent' });
    const undone = reduce(edited, { type: 'undo' });
    const next = reduce(undone, { type: 'set-autopay-balance', cents: 10 });
    expect(next.future).toEqual([]);
    const reloaded = reduce(next, { type: 'hydrate', data });
    expect(reloaded.past).toEqual([]);
    expect(reloaded.future).toEqual([]);
  });

  it('undoes multi-person schedule changes atomically and restores removed related data', () => {
    const people = [paidPerson('A', 2026, 100), paidPerson('B', 2026, 200)];
    const state = reduce(initialHistoryState, { type: 'hydrate', data: { ...data, people } });
    const edited = reduce(state, {
      type: 'update-people', updates: people.map((p) => ({ id: p.id, patch: { schedule: [] } })),
    });
    expect(edited.past).toHaveLength(1);
    expect(reduce(edited, { type: 'undo' }).data.people).toEqual(people);
    const removed = reduce(state, { type: 'remove-person', id: 'A' });
    expect(reduce(removed, { type: 'undo' }).data.people).toEqual(people);
  });

  it('bounds undo history at 100 edits', () => {
    let state = loaded();
    for (let cents = 1; cents <= 110; cents++) {
      state = reduce(state, { type: 'set-autopay-balance', cents });
    }
    expect(state.past).toHaveLength(100);
  });

  it('undoes a contribution lock without changing other accounts or people', () => {
    const person = paidPerson('A', 2026, 100);
    const state = reduce(initialHistoryState, { type: 'hydrate', data: { ...data, people: [person] } });
    const locked = reduce(state, {
      type: 'update-person', id: person.id, patch: { autopayLockedMonthlyCents: 0 },
    });
    expect(reduce(locked, { type: 'undo' }).data.people).toEqual([person]);
    expect(reduce(reduce(locked, { type: 'undo' }), { type: 'redo' }).data.people[0])
      .toMatchObject({ autopayLockedMonthlyCents: 0 });
  });

  it('restores dependent overrides when undoing a deletion', () => {
    const original = { ...data, overrides: [{
      id: 'skip', targetKind: 'bill' as const, targetId: 'Rent',
      fromISO: '2026-10-01', toISO: '2026-10-31',
      mode: 'skip' as const, amountCents: null, note: '',
    }] };
    const state = reduce(initialHistoryState, { type: 'hydrate', data: original });
    const removed = reduce(state, { type: 'remove-bill', id: 'Rent' });
    expect(removed.data.overrides).toEqual([]);
    expect(reduce(removed, { type: 'undo' }).data).toEqual(original);
  });
});
