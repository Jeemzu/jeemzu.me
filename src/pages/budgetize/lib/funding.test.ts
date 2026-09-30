import { describe, expect, it } from 'vitest';
import { computeFundingPlan, createFundedAllocator } from './funding';
import { computeProjection } from './projection';
import type { BudgetData } from '../types';
import { emptyBudget } from '../types';
import { bill, paidPerson } from '../testFixtures';

function budget(partial: Partial<BudgetData>): BudgetData {
  return { ...emptyBudget(), ...partial };
}

// Thursday Oct 1 2026: Rent on the 1st lands before the first Wednesday (Oct 7).
const start = new Date(2026, 9, 1);

const rent = budget({
  people: [paidPerson('A', 2026, 500_00), paidPerson('B', 2026, 1500_00)],
  bills: [bill({ name: 'Rent', amountCents: 700_00, dueDay: 1, paidFrom: 'autopay' })],
});

const minimums = (data: BudgetData) =>
  computeFundingPlan(data, start).autopay.months.map((m) => m.minPerPaydayCents);

describe('computeFundingPlan', () => {
  it('plans from the start month through the last month with pay', () => {
    const plan = computeFundingPlan(rent, start);
    expect(plan.startISO).toBe('2026-10-01');
    expect(plan.months).toEqual([
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
    ]);
  });

  it('asks for opening funds when a charge lands before the first deposit', () => {
    expect(computeFundingPlan(rent, start).autopay.openingFundsCents).toBe(700_00);
    const seeded = budget({ ...rent, autopayBalanceCents: 300_00 });
    expect(computeFundingPlan(seeded, start).autopay.openingFundsCents).toBe(400_00);
  });

  it('sizes each month to cover the next month before its first payday', () => {
    const plan = computeFundingPlan(rent, start).autopay;
    // Oct and Nov each pre-fund the next 1st; December is the last month, so nothing is carried.
    expect(plan.months.map((m) => m.minPerPaydayCents)).toEqual([175_00, 175_00, 0]);
    expect(plan.months.map((m) => m.endBalanceCents)).toEqual([700_00, 700_00, 0]);
    expect(plan.months[0].need).toEqual({
      billsCents: 700_00,
      debtCents: 0,
      oneOffCents: 0,
      totalCents: 700_00,
    });
  });

  it('splits each deposit by gross pay and sums exactly', () => {
    const plan = computeFundingPlan(rent, start).autopay;
    expect(plan.months[0].minShares).toEqual([43_75, 131_25]);
    expect(plan.flatPerPaydayCents).toBe(175_00);
    expect(plan.flatShares).toEqual([43_75, 131_25]);
  });

  it('raises only the month a one-off expense lands in', () => {
    const withOneOff = budget({
      ...rent,
      oneOffs: [
        {
          id: 'x',
          kind: 'expense',
          name: 'Repair',
          amountCents: 400_00,
          dateISO: '2026-11-20',
          account: 'autopay',
          personId: null,
          note: '',
        },
      ],
    });
    expect(minimums(withOneOff)).toEqual([175_00, 275_00, 0]);
    expect(computeFundingPlan(withOneOff, start).autopay.months[1].need.oneOffCents).toBe(400_00);
  });

  it('drops skipped charges from the month they are skipped', () => {
    const skipped = budget({
      ...rent,
      overrides: [
        {
          id: 'o',
          targetKind: 'bill',
          targetId: 'Rent',
          fromISO: '2026-11-01',
          toISO: '2026-11-30',
          mode: 'skip',
          amountCents: null,
          note: '',
        },
      ],
    });
    const plan = computeFundingPlan(skipped, start).autopay;
    expect(plan.months[1].need.totalCents).toBe(0);
    expect(plan.months.map((m) => m.minPerPaydayCents)).toEqual([0, 175_00, 0]);
  });

  it('keeps the smallest flat deposit from ever going negative', () => {
    const funded = budget({ ...rent, autopayBalanceCents: 700_00 });
    const plan = computeFundingPlan(funded, start).autopay;
    expect(plan.openingFundsCents).toBe(0);
    for (const mode of ['minimum', 'flat'] as const) {
      const { weeks } = computeProjection(funded, start, 13, 'suggested', mode);
      expect(weeks.every((w) => w.autopay.endBalanceCents >= 0)).toBe(true);
    }
  });

  it('keeps a flat deposit steady even when a month needs less', () => {
    const plan = computeFundingPlan(rent, start).autopay;
    expect(plan.flatPerPaydayCents).toBeGreaterThanOrEqual(Math.max(...minimums(rent).slice(1)));
  });

  it('is empty without any pay months', () => {
    const plan = computeFundingPlan(budget({ bills: rent.bills }), start);
    expect(plan.months).toEqual([]);
    expect(plan.autopay.flatPerPaydayCents).toBe(0);
  });
});

describe('createFundedAllocator', () => {
  it('leaves personal as whatever the paycheck has left', () => {
    const plan = computeFundingPlan(rent, start);
    const october = { year: 2026, month: 9 };
    const minimum = createFundedAllocator(rent, plan, 'minimum')(october);
    expect(minimum.people.map((p) => p.autopayPerPaycheckCents)).toEqual([43_75, 131_25]);
    expect(minimum.people.map((p) => p.personalPerPaycheckCents)).toEqual([456_25, 1368_75]);
    const flat = createFundedAllocator(rent, plan, 'flat')(october);
    expect(flat.people.map((p) => p.autopayPerPaycheckCents)).toEqual(plan.autopay.flatShares);
  });
});
