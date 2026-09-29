import { describe, expect, it } from 'vitest';
import { computeAutopayPlan } from './autopay';
import type { Bill, BudgetData, DebtAccount, PersonIncome } from '../types';
import { emptyBudget, monthlyRecurrence } from '../types';

function person(
  partial: Partial<PersonIncome> & Pick<PersonIncome, 'name'>,
): PersonIncome {
  return {
    id: partial.name,
    personalPerPaycheckCents: 0,
    essentialsPerPaycheckCents: 0,
    personalBalanceCents: 0,
    ...partial,
  };
}

function bill(partial: Partial<Bill> & Pick<Bill, 'id' | 'name' | 'amountCents' | 'dueDay'>): Bill {
  return { category: '', paidFrom: 'shared', ...monthlyRecurrence(), ...partial };
}

function debt(
  partial: Partial<DebtAccount> & Pick<DebtAccount, 'id' | 'name' | 'minPaymentCents'>,
): DebtAccount {
  return {
    balanceCents: 0,
    suggestedPaymentCents: null,
    hasPromotion: false,
    dueDay: 1,
    paidFrom: 'autopay',
    ...monthlyRecurrence(),
    ...partial,
  };
}

function budget(partial: Partial<BudgetData>): BudgetData {
  return { ...emptyBudget(), ...partial };
}

// Fixed reference date: Friday Sep 25 2026 → simulation starts Oct 1 2026.
const start = new Date(2026, 8, 25);

describe('computeAutopayPlan', () => {
  const data = budget({
    people: [
      person({ name: 'A', essentialsPerPaycheckCents: 500_00 }),
      person({ name: 'B', personalPerPaycheckCents: 500_00, essentialsPerPaycheckCents: 1000_00 }),
    ],
    bills: [bill({ id: 'rent', name: 'Rent', amountCents: 1000_00, dueDay: 1, paidFrom: 'autopay' })],
    debts: [
      debt({
        id: 'promo',
        name: 'Promo',
        minPaymentCents: 200_00,
        suggestedPaymentCents: 900_00,
        hasPromotion: true,
        dueDay: 13,
      }),
    ],
  });

  it('sizes debts with the active strategy (suggested by default)', () => {
    const plan = computeAutopayPlan(data, start);
    expect(plan.billsMonthlyCents).toBe(1000_00);
    expect(plan.debtMonthlyCents).toBe(900_00);
    expect(plan.totalMonthlyCents).toBe(1900_00);
    expect(plan.perPaydayCents).toBe(475_00);
  });

  it('sizes debts at minimums under the minimum strategy', () => {
    const plan = computeAutopayPlan(data, start, 12, 'minimum');
    expect(plan.debtMonthlyCents).toBe(200_00);
    expect(plan.totalMonthlyCents).toBe(1200_00);
    expect(plan.perPaydayCents).toBe(300_00);
  });

  it('ignores bills and debts flagged as paid from shared', () => {
    const mixed = budget({
      bills: [bill({ id: 'rent', name: 'Rent', amountCents: 1000_00, dueDay: 1 })],
      debts: [
        debt({ id: 'card', name: 'Card', minPaymentCents: 200_00, dueDay: 13 }),
      ],
    });
    const plan = computeAutopayPlan(mixed, start);
    expect(plan.billsMonthlyCents).toBe(0);
    expect(plan.debtMonthlyCents).toBe(200_00);
    expect(plan.totalMonthlyCents).toBe(200_00);
  });

  it('splits deposits proportionally to gross pay and sums exactly', () => {
    const plan = computeAutopayPlan(data, start, 12, 'minimum');
    // Weights: A 500, B 1500 → 25% / 75%.
    expect(plan.shares).toEqual([
      { personId: 'A', name: 'A', monthlyCents: 300_00, perPaydayCents: 75_00 },
      { personId: 'B', name: 'B', monthlyCents: 900_00, perPaydayCents: 225_00 },
    ]);
  });

  it('distributes odd cents without losing any', () => {
    const odd = budget({
      people: [person({ name: 'A', essentialsPerPaycheckCents: 1 }), person({ name: 'B', essentialsPerPaycheckCents: 1 })],
      bills: [bill({ id: 'x', name: 'X', amountCents: 100_01, dueDay: 1, paidFrom: 'autopay' })],
    });
    const plan = computeAutopayPlan(odd, start);
    expect(plan.shares.map((s) => s.monthlyCents)).toEqual([50_01, 50_00]);
    expect(plan.shares.reduce((sum, s) => sum + s.monthlyCents, 0)).toBe(plan.totalMonthlyCents);
  });

  it('splits evenly when nobody has income yet', () => {
    const zero = budget({
      people: [person({ name: 'A' }), person({ name: 'B' })],
      bills: [bill({ id: 'x', name: 'X', amountCents: 100_00, dueDay: 1, paidFrom: 'autopay' })],
    });
    const plan = computeAutopayPlan(zero, start);
    expect(plan.shares.map((s) => s.monthlyCents)).toEqual([50_00, 50_00]);
  });

  it('sizes the buffer so the simulated balance never goes negative', () => {
    const rentOnly = budget({
      bills: [bill({ id: 'rent', name: 'Rent', amountCents: 700_00, dueDay: 1, paidFrom: 'autopay' })],
    });
    const plan = computeAutopayPlan(rentOnly, start);
    expect(plan.simStartISO).toBe('2026-10-01');
    expect(plan.perPaydayCents).toBe(175_00);
    // Rent leaves on the 1st before any Wednesday deposit lands.
    expect(plan.bufferCents).toBe(700_00);
  });

  it('credits the current balance against the needed buffer', () => {
    const rentOnly = budget({
      bills: [bill({ id: 'rent', name: 'Rent', amountCents: 700_00, dueDay: 1, paidFrom: 'autopay' })],
      autopayBalanceCents: 300_00,
    });
    expect(computeAutopayPlan(rentOnly, start).bufferCents).toBe(400_00);
    const funded = budget({ ...rentOnly, autopayBalanceCents: 700_00 });
    expect(computeAutopayPlan(funded, start).bufferCents).toBe(0);
  });

  it('returns an all-zero plan when there is nothing to pay', () => {
    const plan = computeAutopayPlan(budget({}), start);
    expect(plan.totalMonthlyCents).toBe(0);
    expect(plan.perPaydayCents).toBe(0);
    expect(plan.bufferCents).toBe(0);
    expect(plan.shares).toEqual([]);
  });
});
