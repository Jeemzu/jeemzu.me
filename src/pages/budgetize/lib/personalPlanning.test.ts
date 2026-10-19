import { describe, expect, it } from 'vitest';
import { emptyBudget, type BudgetData, type PersonalExpense } from '../types';
import { bill, paidPerson } from '../testFixtures';
import { computeFundingPlan, createFundedAllocator, type DepositMode } from './funding';
import { computeProjection } from './projection';
import { personalExpenseOccursOn, personalExpenseShares } from './personalPlanning';
import { parseBackup, parseBudgetData, serializeBackup } from './backup';
import { computeMonthSummary } from './schedule';
import { buildExportSheets } from './spreadsheetExport';
import { budgetHistoryReducer, initialHistoryState } from '../state/history';
import { budgetReducer, type Action } from '../state/budget';

const start = new Date(2026, 11, 2);
const expense: PersonalExpense = {
  id: 'trip', name: 'December trip', amountCents: 100_01,
  dateISO: '2026-12-04', frequency: 'once', endISO: null, personId: null,
};

function budget(): BudgetData {
  return {
    ...emptyBudget(), projectionStartISO: '2026-12-02',
    people: [
      paidPerson('A', 2026, 500_00, { personalBalanceCents: 100_00,
        autopayLockedPerPaycheckCents: 100_00 }),
      paidPerson('B', 2026, 1500_00, { personalBalanceCents: 200_00 }),
    ],
    bills: [bill({ name: 'Utilities', amountCents: 200_00, dueDay: 10 })],
    personalExpenses: [expense],
  };
}

function allocator(data: BudgetData, mode: DepositMode = 'minimum') {
  return createFundedAllocator(data, computeFundingPlan(data, start), mode);
}

describe('personal expense schedules', () => {
  it('charges a one-time expense only on its date', () => {
    expect(personalExpenseOccursOn(expense, new Date(2026, 11, 4))).toBe(true);
    expect(personalExpenseOccursOn(expense, new Date(2027, 0, 4))).toBe(false);
    expect(personalExpenseOccursOn(expense, new Date(2026, 11, 3))).toBe(false);
  });

  it.each([
    ['weekly', '2026-12-11', '2026-12-12'],
    ['biweekly', '2026-12-18', '2026-12-11'],
    ['monthly', '2027-01-04', '2026-12-03'],
    ['quarterly', '2027-03-04', '2027-01-04'],
    ['annual', '2027-12-04', '2027-01-04'],
  ] as const)('supports %s with an inclusive end date', (frequency, due, notDue) => {
    const item = { ...expense, frequency, endISO: due };
    const date = (iso: string) => new Date(`${iso}T00:00:00`);
    expect(personalExpenseOccursOn(item, date(due))).toBe(true);
    expect(personalExpenseOccursOn(item, date(notDue))).toBe(false);
    expect(personalExpenseOccursOn({ ...item, endISO: '2026-12-04' }, date(due))).toBe(false);
  });

  it('clamps calendar dates without drifting and never charges before the first date', () => {
    const item = { ...expense, dateISO: '2026-01-31', frequency: 'monthly' as const };
    expect(personalExpenseOccursOn(item, new Date(2026, 1, 28))).toBe(true);
    expect(personalExpenseOccursOn(item, new Date(2026, 2, 31))).toBe(true);
    expect(personalExpenseOccursOn(item, new Date(2026, 2, 28))).toBe(false);
    expect(personalExpenseOccursOn(item, new Date(2025, 11, 31))).toBe(false);
    const data = { ...budget(), personalExpenses: [item] };
    expect(computeMonthSummary(data, 2026, 1).scheduled).toContainEqual(expect.objectContaining({
      kind: 'personal-expense', day: 28, dueDay: 31, moved: true, amountCents: expense.amountCents,
    }));
  });
});

describe('personal expense allocation and projection', () => {
  it.each(['minimum', 'flat'] as const)('uses actual post-funding remainders in %s mode, preserving cents', (mode) => {
    const data = budget();
    const allocation = allocator(data, mode)({ year: 2026, month: 11 });
    const weights = allocation.people.map((p) => p.personalPerPaycheckCents * p.paycheckCount);
    const shares = personalExpenseShares(expense, allocation);
    expect(shares.incomeKnown).toBe(true);
    expect(shares.cents[0]).toBe(Math.round(expense.amountCents * weights[0] / (weights[0] + weights[1])));
    expect(shares.cents.reduce((sum, cents) => sum + cents, 0)).toBe(expense.amountCents);
    expect(shares.cents[0]).not.toBe(Math.round(expense.amountCents / 4));
    const week = computeProjection(data, start, 1, 'suggested', mode).weeks[0];
    expect(week.personal.map((a) => a.outflowCents)).toEqual(shares.cents);
  });

  it('charges an individual expense only to its owner, in addition to existing one-offs', () => {
    const data = budget();
    data.personalExpenses = [expense, { ...expense, id: 'own', name: 'Train', personId: 'A', amountCents: 2500 }];
    data.oneOffs = [{
      id: 'existing', name: 'Hotel', kind: 'expense', account: 'personal',
      personId: 'A', dateISO: expense.dateISO, amountCents: 900, note: '',
    }, {
      id: 'deposit', name: 'Refund', kind: 'income', account: 'personal',
      personId: 'B', dateISO: expense.dateISO, amountCents: 700, note: '',
    }];
    const week = computeProjection(data, start, 1).weeks[0];
    const shares = personalExpenseShares(expense, allocator(data)({ year: 2026, month: 11 })).cents;
    expect(week.personal.map((a) => a.outflowCents)).toEqual([shares[0] + 3400, shares[1]]);
    week.personal.forEach((account, i) => {
      expect(account.endBalanceCents).toBe(data.people[i].personalBalanceCents + account.depositCents - account.outflowCents);
    });
    expect(week.inflows[0].amountCents).toBe(700);
    expect(week.outflows.filter((e) => e.personalExpenseScope === 'combined')).toHaveLength(2);
  });

  it('uses equal provisional shares when any income is missing, including on non-paydays', () => {
    const data = budget();
    data.people[0].schedule = [];
    const shares = personalExpenseShares(expense, allocator(data)({ year: 2026, month: 11 }));
    expect(shares).toEqual({ cents: [5001, 5000], incomeKnown: false });
    const day = computeProjection(data, start, 1).weeks[0].days.find((d) => d.dateISO === expense.dateISO);
    expect(day?.isPayday).toBe(false);
    expect(day?.incomeKnown).toBe(false);
    expect(day?.personal.map((a) => a.outflowCents)).toEqual(shares.cents);
  });

  it('clamps negative weighting to zero and splits equally when no remainder is positive', () => {
    const data = budget();
    data.people[0].autopayLockedPerPaycheckCents = 1000_00;
    const allocate = allocator(data);
    expect(personalExpenseShares(expense, allocate({ year: 2026, month: 11 })).cents).toEqual([0, 10001]);
    data.people[1].autopayLockedPerPaycheckCents = 2000_00;
    expect(personalExpenseShares(expense, allocator(data)({ year: 2026, month: 11 })).cents).toEqual([5001, 5000]);
  });

  it('recalculates recurring shares by occurrence month', () => {
    const data = budget();
    data.people.forEach((person, i) => {
      person.schedule.push({ year: 2027, month: 0, paycheckCount: 4, perPaycheckCents: i === 0 ? 1500_00 : 500_00 });
    });
    data.personalExpenses = [{ ...expense, frequency: 'monthly' }];
    const weeks = computeProjection(data, start, 6).weeks;
    const charges = weeks.flatMap((w) => w.outflows).filter((o) => o.kind === 'personal-expense');
    const december = charges.find((o) => o.dateISO === '2026-12-04' && o.personId === 'A')!;
    const january = charges.find((o) => o.dateISO === '2027-01-04' && o.personId === 'A')!;
    expect(january.amountCents).toBeGreaterThan(december.amountCents);
  });

  it('includes plans once in calendar/monthly totals without changing shared funding', () => {
    const data = budget();
    data.personalExpenses = [expense, { ...expense, id: 'own', personId: 'A', amountCents: 2000 }];
    const without = { ...data, personalExpenses: [] };
    expect(computeFundingPlan(data, start)).toEqual(computeFundingPlan(without, start));
    const summary = computeMonthSummary(data, 2026, 11, 'suggested', allocator(data));
    const baseline = computeMonthSummary(without, 2026, 11, 'suggested', allocator(without));
    expect(summary.personalExpenseCents).toBe(12001);
    expect(summary.accounts.personal.chargesCents).toBe(12001);
    expect(summary.outflowTotalCents - baseline.outflowTotalCents).toBe(12001);
    expect(summary.scheduled.filter((s) => s.kind === 'personal-expense')).toHaveLength(2);
    expect(summary.categories).toContainEqual({ category: 'Personal', totalCents: 12001, share: 12001 / summary.outflowTotalCents });
  });

  it('keeps pre-start expenses out and allows negative personal balances', () => {
    const data = budget();
    data.people.forEach((p) => { p.schedule = []; p.personalBalanceCents = 0; });
    data.personalExpenses = [expense, { ...expense, id: 'past', dateISO: '2026-12-01', amountCents: 999999 }];
    const week = computeProjection(data, start, 1).weeks[0];
    expect(week.personal.map((a) => a.endBalanceCents)).toEqual([-5001, -5000]);
  });
});

describe('personal plan persistence', () => {
  it('round-trips combined and individual recurring expenses and exports them', () => {
    const data = budget();
    data.personalExpenses = [expense, { ...expense, id: 'own', frequency: 'annual', personId: 'A', endISO: '2028-12-04' }];
    expect(parseBackup(serializeBackup(data))).toEqual({ ok: true, data });
    expect(parseBudgetData(data)).toEqual({ ok: true, data });
    const sheet = buildExportSheets(data, start).find((s) => s.name === 'Personal planning')!;
    expect(sheet.rows[1]).toEqual(['2026-12-04', 'December trip', 100.01, 'once', null, 'Combined (proportional)']);
    expect(sheet.rows[2].at(-1)).toBe('A');
  });

  it('loads older budgets without personal plans', () => {
    const data = budget();
    delete data.personalExpenses;
    expect(parseBudgetData(data)).toEqual({ ok: true, data: { ...data, personalExpenses: [] } });
  });

  it.each([
    { amountCents: -1 }, { amountCents: 1.5 }, { dateISO: '2026-02-30' },
    { dateISO: '' }, { endISO: '2026-12-01' }, { frequency: 'daily' },
    { personId: 'missing' }, { name: '' },
  ])('rejects malformed personal expenses: %j', (patch) => {
    expect(parseBudgetData({ ...budget(), personalExpenses: [{ ...expense, ...patch }] })).toMatchObject({ ok: false });
  });

  it('supports saved edits, undo/redo, reload and removal', () => {
    const data = { ...budget(), personalExpenses: [] };
    let state = budgetHistoryReducer(initialHistoryState, { type: 'hydrate', data });
    state = budgetHistoryReducer(state, { type: 'add-personal-expense', expense });
    const added = state.data;
    state = budgetHistoryReducer(state, { type: 'mark-saved', data: added });
    state = budgetHistoryReducer(state, { type: 'update-personal-expense', id: expense.id, patch: { amountCents: 20000 } });
    expect(state.data.personalExpenses?.[0].amountCents).toBe(20000);
    state = budgetHistoryReducer(state, { type: 'undo' });
    expect(state.data).toBe(added);
    expect(state.dirty).toBe(false);
    state = budgetHistoryReducer(state, { type: 'redo' });
    expect(state.data.personalExpenses?.[0].amountCents).toBe(20000);
    state = budgetHistoryReducer(state, { type: 'remove-personal-expense', id: expense.id });
    expect(state.data.personalExpenses).toEqual([]);
    state = budgetHistoryReducer(state, { type: 'hydrate', data: added });
    expect(state.data.personalExpenses).toEqual([expense]);
    expect(state.dirty).toBe(false);
  });

  it('removes only individual plans when deleting a person or replacing imported people', () => {
    const data = budget();
    data.personalExpenses = [expense, { ...expense, id: 'own', personId: 'A' }];
    const actions: Action[] = [
      { type: 'remove-person', id: 'A' },
      { type: 'import-data', payload: { people: [{ name: 'B', schedule: data.people[1].schedule }] } },
    ];
    for (const action of actions) {
      const result = budgetReducer({ data, dirty: false }, action);
      expect(result.data.personalExpenses).toEqual([expense]);
    }
  });
});
