import { describe, expect, it } from 'vitest';
import { BILL_CATEGORY, computeMonthSummary, DEBT_CATEGORY, resolveDueDay } from './schedule';
import type { BudgetData } from '../types';
import { emptyBudget } from '../types';
import { bill, debt, paidPerson } from '../testFixtures';

function budget(partial: Partial<BudgetData>): BudgetData {
  return { ...emptyBudget(), ...partial };
}

describe('resolveDueDay', () => {
  it('keeps due days that fit in the month', () => {
    expect(resolveDueDay(2026, 0, 31)).toBe(31);
    expect(resolveDueDay(2026, 8, 15)).toBe(15);
  });

  it('moves days 29-31 to the last day of shorter months', () => {
    expect(resolveDueDay(2027, 1, 31)).toBe(28); // Feb 2027
    expect(resolveDueDay(2027, 1, 29)).toBe(28);
    expect(resolveDueDay(2028, 1, 31)).toBe(29); // leap year Feb
    expect(resolveDueDay(2026, 3, 31)).toBe(30); // April
  });
});

describe('computeMonthSummary', () => {
  it('budgets subscriptions identically to bills for either payment account', () => {
    for (const paidFrom of ['shared', 'autopay'] as const) {
      const regular = budget({
        people: [paidPerson('A', 2026, 500_00)],
        bills: [bill({ id: 's1', name: 'Streaming', amountCents: 1500, dueDay: 15, paidFrom })],
      });
      const subscription = {
        ...regular,
        bills: regular.bills.map((entry) => ({ ...entry, isSubscription: true })),
      };
      expect(computeMonthSummary(subscription, 2026, 9))
        .toEqual(computeMonthSummary(regular, 2026, 9));
      expect(computeMonthSummary(subscription, 2026, 9).billsTotalCents).toBe(1500);
    }
  });

  const data = budget({
    people: [paidPerson('A', 2026, 2300_00)],
    bills: [
      bill({ name: 'Rent', amountCents: 3250_00, dueDay: 1, paidFrom: 'shared' }),
      bill({ name: 'Electric', amountCents: 300_00, dueDay: 1, paidFrom: 'shared' }),
      bill({ name: 'Spectrum', amountCents: 90_00, dueDay: 21, paidFrom: 'shared' }),
    ],
  });

  it('computes a five-payday month (September 2026)', () => {
    const summary = computeMonthSummary(data, 2026, 8);
    expect(summary.paydays).toHaveLength(5);
    expect(summary.incomeKnown).toBe(true);
    expect(summary.incomeCents).toBe(11500_00);
    // Essentials deposits are sized to the shared bills themselves.
    expect(summary.essentialsIncomeCents).toBe(3640_00);
    expect(summary.billsTotalCents).toBe(3640_00);
    expect(summary.debtsTotalCents).toBe(0);
    expect(summary.remainingCents).toBe(7860_00);
    expect(summary.perPaydayCents).toBe(1572_00);
  });

  it('computes a four-payday month (October 2026)', () => {
    const summary = computeMonthSummary(data, 2026, 9);
    expect(summary.paydays).toHaveLength(4);
    expect(summary.incomeCents).toBe(9200_00);
    expect(summary.remainingCents).toBe(5560_00);
    expect(summary.perPaydayCents).toBe(1390_00);
  });

  it('reports no income for months outside the pay schedule', () => {
    const summary = computeMonthSummary(data, 2028, 0);
    expect(summary.incomeKnown).toBe(false);
    expect(summary.incomeCents).toBe(0);
    expect(summary.essentialsIncomeCents).toBe(0);
    expect(summary.remainingCents).toBe(-3640_00);
  });

  it('sums gross pay across everyone', () => {
    const mixed = budget({
      people: [paidPerson('A', 2026, 300_00), paidPerson('B', 2026, 450_00)],
    });
    const summary = computeMonthSummary(mixed, 2026, 9); // 4 paydays
    expect(summary.incomeCents).toBe(3000_00);
    expect(summary.essentialsIncomeCents).toBe(0);
    expect(summary.remainingCents).toBe(3000_00);
  });

  it('supports negative remaining balances', () => {
    const tight = budget({
      people: [paidPerson('A', 2026, 500_00)],
      bills: data.bills,
    });
    const summary = computeMonthSummary(tight, 2026, 9);
    expect(summary.remainingCents).toBe(2000_00 - 3640_00);
    expect(summary.perPaydayCents).toBe(Math.round((2000_00 - 3640_00) / 4));
  });

  it('carves auto-pay funding out of gross pay', () => {
    const withAutopay = budget({
      people: [paidPerson('A', 2026, 500_00)],
      bills: [
        bill({ name: 'Electric', amountCents: 400_00, dueDay: 15, paidFrom: 'autopay' }),
        bill({ name: 'Rent', amountCents: 1000_00, dueDay: 1, paidFrom: 'shared' }),
      ],
    });
    // October 2026: 4 paydays → funding = 4 × $100.
    const summary = computeMonthSummary(withAutopay, 2026, 9);
    expect(summary.autopayFundingCents).toBe(400_00);
    expect(summary.essentialsIncomeCents).toBe(1000_00);
    expect(summary.outflowTotalCents).toBe(1400_00);
    expect(summary.remainingCents).toBe(600_00);

    // September 2026 pays five times, so the same need spreads thinner per payday.
    const five = computeMonthSummary(withAutopay, 2026, 8);
    expect(five.autopayFundingCents).toBe(400_00);
    expect(five.remainingCents).toBe(2500_00 - 1400_00);
  });

  it('budgets suggested payments for promo debts and minimums otherwise', () => {
    const withDebts = budget({
      debts: [
        debt({ name: 'Promo', minPaymentCents: 100_00, suggestedPaymentCents: 500_00, hasPromotion: true, paidFrom: 'shared' }),
        debt({ name: 'Plain', minPaymentCents: 200_00, suggestedPaymentCents: 999_00, paidFrom: 'shared' }),
        debt({ name: 'PromoNoSuggestion', minPaymentCents: 75_00, hasPromotion: true, paidFrom: 'shared' }),
      ],
    });
    const summary = computeMonthSummary(withDebts, 2026, 8);
    expect(summary.debtsTotalCents).toBe(775_00);
    expect(summary.outflowTotalCents).toBe(775_00);
    expect(summary.remainingCents).toBe(-775_00);

    const minimums = computeMonthSummary(withDebts, 2026, 8, 'minimum');
    expect(minimums.debtsTotalCents).toBe(375_00);
    // Same day → alphabetical: Plain, Promo, PromoNoSuggestion.
    expect(minimums.scheduled.map((s) => s.amountCents)).toEqual([200_00, 100_00, 75_00]);
  });

  it('schedules debts beside bills sorted by day then name', () => {
    const mixed = budget({
      bills: [bill({ name: 'Rent', amountCents: 100_00, dueDay: 13 })],
      debts: [
        debt({ name: 'Card', minPaymentCents: 50_00, dueDay: 13, paidFrom: 'shared' }),
        debt({ name: 'Loan', minPaymentCents: 60_00, dueDay: 2, paidFrom: 'shared' }),
      ],
    });
    const summary = computeMonthSummary(mixed, 2026, 8);
    expect(summary.scheduled.map((s) => [s.name, s.kind, s.day])).toEqual([
      ['Loan', 'debt', 2],
      ['Card', 'debt', 13],
      ['Rent', 'bill', 13],
    ]);
  });

  it('marks items moved from short-month due days', () => {
    const withLate = budget({
      bills: [bill({ name: 'Loan', amountCents: 100_00, dueDay: 31 })],
    });
    const summary = computeMonthSummary(withLate, 2027, 1);
    expect(summary.scheduled[0].day).toBe(28);
    expect(summary.scheduled[0].moved).toBe(true);

    const january = computeMonthSummary(withLate, 2027, 0);
    expect(january.scheduled[0].day).toBe(31);
    expect(january.scheduled[0].moved).toBe(false);
  });

  it('separates bills from debt payments in the breakdown', () => {
    const mixed = budget({
      bills: [
        bill({ name: 'Rent', amountCents: 600_00, dueDay: 1 }),
        bill({ name: 'Misc', amountCents: 100_00, dueDay: 3 }),
      ],
      debts: [debt({ name: 'Card', minPaymentCents: 300_00, paidFrom: 'shared' })],
    });
    const summary = computeMonthSummary(mixed, 2026, 8);
    expect(summary.categories).toEqual([
      { category: BILL_CATEGORY, totalCents: 700_00, share: 0.7 },
      { category: DEBT_CATEGORY, totalCents: 300_00, share: 0.3 },
    ]);
  });
});
