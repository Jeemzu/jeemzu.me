import { describe, expect, it } from 'vitest';
import { computeAutopayPlan } from './autopay';
import type { BudgetData } from '../types';
import { emptyBudget } from '../types';
import { bill, debt, paidPerson, person } from '../testFixtures';

function budget(partial: Partial<BudgetData>): BudgetData {
  return { ...emptyBudget(), ...partial };
}

// Fixed reference date: Friday Sep 25 2026 → simulation starts Oct 1 2026.
const start = new Date(2026, 8, 25);

describe('computeAutopayPlan', () => {
  const data = budget({
    people: [paidPerson('A', 2026, 500_00), paidPerson('B', 2026, 1500_00)],
    bills: [bill({ name: 'Rent', amountCents: 1000_00, dueDay: 1, paidFrom: 'autopay' })],
    debts: [
      debt({
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
      bills: [bill({ name: 'Rent', amountCents: 1000_00, dueDay: 1 })],
      debts: [debt({ name: 'Card', minPaymentCents: 200_00, dueDay: 13 })],
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
      people: [paidPerson('A', 2026, 1), paidPerson('B', 2026, 1)],
      bills: [bill({ name: 'X', amountCents: 100_01, dueDay: 1, paidFrom: 'autopay' })],
    });
    const plan = computeAutopayPlan(odd, start);
    expect(plan.shares.map((s) => s.monthlyCents)).toEqual([50_01, 50_00]);
    expect(plan.shares.reduce((sum, s) => sum + s.monthlyCents, 0)).toBe(plan.totalMonthlyCents);
  });

  it('splits evenly when nobody has income yet', () => {
    const zero = budget({
      people: [person({ name: 'A' }), person({ name: 'B' })],
      bills: [bill({ name: 'X', amountCents: 100_00, dueDay: 1, paidFrom: 'autopay' })],
    });
    const plan = computeAutopayPlan(zero, start);
    expect(plan.shares.map((s) => s.monthlyCents)).toEqual([50_00, 50_00]);
  });

  it('sizes the buffer so the simulated balance never goes negative', () => {
    const rentOnly = budget({
      bills: [bill({ name: 'Rent', amountCents: 700_00, dueDay: 1, paidFrom: 'autopay' })],
    });
    const plan = computeAutopayPlan(rentOnly, start);
    expect(plan.simStartISO).toBe('2026-10-01');
    expect(plan.perPaydayCents).toBe(175_00);
    // Rent leaves on the 1st before any Wednesday deposit lands.
    expect(plan.bufferCents).toBe(700_00);
  });

  it('credits the current balance against the needed buffer', () => {
    const rentOnly = budget({
      bills: [bill({ name: 'Rent', amountCents: 700_00, dueDay: 1, paidFrom: 'autopay' })],
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
