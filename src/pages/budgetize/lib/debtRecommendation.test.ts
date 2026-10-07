import { describe, expect, it } from 'vitest';
import { emptyBudget, type BudgetData } from '../types';
import { debt, paidPerson } from '../testFixtures';
import { computeFundingPlan } from './funding';
import { computeDebtPayoffRecommendation } from './debtRecommendation';

const start = new Date(2026, 0, 1);

function makeBudget(): BudgetData {
  return {
    ...emptyBudget(),
    people: [paidPerson('Alex', 2026, 100_00)],
    debts: [
      debt({
        name: 'High APR',
        balanceCents: 20_000,
        minPaymentCents: 1_000,
        interestRateBps: 2_500,
      }),
      debt({
        name: 'Lower APR',
        balanceCents: 50_000,
        minPaymentCents: 500,
        interestRateBps: 1_200,
      }),
    ],
  };
}

describe('computeDebtPayoffRecommendation', () => {
  it('applies unlocked personal remainder to highest APR first and caps at balances', () => {
    const data = makeBudget();
    const plan = computeFundingPlan(data, start, 'minimum');
    const recommendation = computeDebtPayoffRecommendation(
      data,
      start,
      plan,
      'minimum',
      'minimum',
    );

    expect(recommendation.status).toBe('ready');
    expect(recommendation.monthlyAvailableCents).toBeGreaterThan(0);
    expect(recommendation.allocations.map(({ debtName }) => debtName)).toEqual([
      'High APR',
      'Lower APR',
    ]);
    expect(recommendation.allocations[0].monthlyExtraCents).toBe(19_000);
    expect(recommendation.allocations[1].monthlyExtraCents).toBe(18_000);
  });

  it('excludes people with a locked contribution from the surplus', () => {
    const data = makeBudget();
    data.people.push(
      paidPerson('Locked', 2026, 500_00, {
        autopayLockedPerPaycheckCents: 0,
      }),
    );
    const plan = computeFundingPlan(data, start, 'minimum');
    const recommendation = computeDebtPayoffRecommendation(
      data,
      start,
      plan,
      'minimum',
      'minimum',
    );

    expect(recommendation.monthlyAvailableCents).toBeLessThan(400_00);
    expect(recommendation.allocations[0].debtName).toBe('High APR');
  });

  it('deducts personal one-off expenses from the available amount', () => {
    const data = makeBudget();
    data.oneOffs = [
      {
        id: 'repair',
        kind: 'expense',
        name: 'Repair',
        amountCents: 2_000,
        dateISO: '2026-01-15',
        account: 'personal',
        personId: 'Alex',
        note: '',
      },
    ];
    const plan = computeFundingPlan(data, start, 'minimum');
    const recommendation = computeDebtPayoffRecommendation(
      data,
      start,
      plan,
      'minimum',
      'minimum',
    );

    expect(recommendation.monthlyAvailableCents).toBeLessThan(400_00);
  });

  it('does not rank an outstanding debt when any interest rate is missing', () => {
    const data = makeBudget();
    data.debts[1].interestRateBps = null;
    const plan = computeFundingPlan(data, start, 'minimum');
    const recommendation = computeDebtPayoffRecommendation(
      data,
      start,
      plan,
      'minimum',
      'minimum',
    );

    expect(recommendation.status).toBe('missing-rates');
    expect(recommendation.allocations).toEqual([]);
  });

  it('does not estimate a full monthly amount from a partial start month alone', () => {
    const data = makeBudget();
    for (const person of data.people) {
      person.schedule = person.schedule.filter((entry) => entry.month === 0);
    }
    const partialStart = new Date(2026, 0, 15);
    const plan = computeFundingPlan(data, partialStart, 'minimum');
    const recommendation = computeDebtPayoffRecommendation(
      data,
      partialStart,
      plan,
      'minimum',
      'minimum',
    );

    expect(recommendation.status).toBe('no-income-forecast');
  });
});
