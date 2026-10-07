import { describe, expect, it } from 'vitest';
import { allocateMonth } from './allocation';
import { unlockedShares } from './contributions';
import { computeFundingPlan, createFundedAllocator } from './funding';
import { computeProjection } from './projection';
import { computeMonthSummary } from './schedule';
import { computeFundingWarnings } from './warnings';
import { emptyBudget } from '../types';
import { bill, paidPerson } from '../testFixtures';
import { getPaydays } from './paydays';

const ref = { year: 2026, month: 9 };
const start = new Date(2026, 9, 1);
const singleMonth = (name: string, gross: number, lock: number | null = null) =>
  paidPerson(name, 2026, gross, {
    schedule: [{ ...ref, paycheckCount: 4, perPaycheckCents: gross }],
    autopayLockedPerPaycheckCents: lock,
  });
const budget = (need = 100000) => ({
  ...emptyBudget(),
  people: [singleMonth('A', 100000, 5000), singleMonth('B', 100000), singleMonth('C', 300000)],
  bills: [bill({ name: 'Bill', amountCents: need, dueDay: 29, paidFrom: 'autopay' })],
});

describe('fixed per-paycheck contributions', () => {
  it('redistributes increased and decreased requirements proportionally among only unlocked people', () => {
    for (const [need, expected] of [
      [100000, [5000, 5000, 15000]],
      [140000, [5000, 7500, 22500]],
      [60000, [5000, 2500, 7500]],
    ] as const) {
      const data = budget(need);
      for (const mode of ['minimum', 'flat'] as const) {
        const plan = computeFundingPlan(data, start);
        const allocation = createFundedAllocator(data, plan, mode)(ref);
        expect(allocation.people.map((p) => p.autopayPerPaycheckCents)).toEqual(expected);
        expect(allocation.people.map((p) => p.essentialsPerPaycheckCents)).toEqual([0, 0, 0]);
      }
      expect(allocateMonth(data, ref).people.map((p) => p.autopayPerPaycheckCents)).toEqual(expected);
    }
  });

  it('deposits the exact held amount on every payday in four- and five-Wednesday months', () => {
    for (const month of [6, 9]) {
      const monthRef = { year: 2026, month };
      const paydays = getPaydays(2026, month);
      const data = {
        ...budget(),
        people: [paidPerson('A', 2026, 100000, {
          schedule: [{ ...monthRef, paycheckCount: paydays.length, perPaycheckCents: 100000 }],
          autopayLockedPerPaycheckCents: 20001,
          essentialsLockedPerPaycheckCents: 10003,
        }), singleMonth('B', 100000)],
      };
      const planStart = new Date(2026, month, 1);
      for (const mode of ['minimum', 'flat'] as const) {
        const plan = computeFundingPlan(data, planStart);
        const allocationFor = createFundedAllocator(data, plan, mode);
        const allocation = allocationFor(monthRef);
        expect(allocation.people[0].autopayPerPaycheckCents).toBe(20001);
        expect(allocation.people[0].essentialsPerPaycheckCents).toBe(10003);
        const summary = computeMonthSummary(data, 2026, month, 'suggested', allocationFor);
        expect(summary.accounts.autopay.depositsCents).toBe(
          20001 * paydays.length +
          allocation.people[1].autopayPerPaycheckCents * allocation.people[1].paycheckCount,
        );
        const projection = computeProjection(data, planStart, 6, 'suggested', mode);
        const days = projection.weeks.flatMap((w) => w.days)
          .filter((day) => Number(day.dateISO.slice(5, 7)) === month + 1);
        expect(days.reduce((sum, day) => sum + day.essentials.depositCents, 0))
          .toBe(10003 * paydays.length);
        for (const day of days) {
          expect(day.contributions[0]).toEqual(day.isPayday
            ? { autopayCents: 20001, essentialsCents: 10003 }
            : { autopayCents: 0, essentialsCents: 0 });
        }
      }
    }
  });

  it('deposits the held amount only on remaining paydays in a partial starting month', () => {
    const data = { ...budget(0), people: [singleMonth('A', 100000, 20001)] };
    const projection = computeProjection(data, new Date(2026, 9, 15), 3);
    expect(projection.weeks.reduce((sum, w) => sum + w.autopay.depositCents, 0)).toBe(40002);
  });

  it('floors unlocked contributions at zero and reports excess funding', () => {
    const data = budget(10000);
    const plan = computeFundingPlan(data, start);
    expect(plan.autopay.months[0].minShares).toEqual([5000, 0, 0]);
    const warnings = computeFundingWarnings(data, computeProjection(data, start, 5), plan,
      createFundedAllocator(data, plan, 'minimum'));
    expect(warnings.some((w) => w.message.includes('exceed the monthly minimum'))).toBe(true);
  });

  it('preserves all-locked amounts and reports the unfunded remainder', () => {
    const data = { ...budget(), people: [singleMonth('A', 100000, 5000)] };
    const plan = computeFundingPlan(data, start);
    expect(plan.autopay.months[0].minShares).toEqual([5000]);
    expect(plan.autopay.months[0].shortfallCents).toBe(80000);
    expect(plan.autopay.months[0].endBalanceCents).toBe(-80000);
    const warnings = computeFundingWarnings(data, computeProjection(data, start, 5), plan,
      createFundedAllocator(data, plan, 'minimum'));
    expect(warnings.some((w) => w.severity === 'error' && w.message.includes('All people'))).toBe(true);
  });

  it('treats a zero lock as locked, excludes absent income, and splits zero-weight eligible shares equally', () => {
    expect(unlockedShares(100, [10, 0, 0, 50], [true, true, true, false], [0, null, null, null]))
      .toEqual([0, 50, 50, 0]);
    const data = { ...budget(), people: [
      singleMonth('A', 100000, 0),
      singleMonth('B', 100000),
      paidPerson('Absent', 2027, 100000, { schedule: [], autopayLockedPerPaycheckCents: 99999 }),
    ] };
    const allocation = createFundedAllocator(data, computeFundingPlan(data, start), 'minimum')(ref);
    expect(allocation.people.map((p) => p.autopayPerPaycheckCents)).toEqual([0, 25000, 0]);
    expect(allocation.people[2].hasIncome).toBe(false);
  });

  it('accounts for payday charges before deposits without changing the locked amount', () => {
    const data = budget();
    data.bills[0].dueDay = 28;
    const plan = computeFundingPlan(data, start);
    expect(plan.autopay.months[0].minShares).toEqual([5000, 7084, 21250]);
    for (const mode of ['minimum', 'flat'] as const) {
      const projection = computeProjection(data, start, 5, 'suggested', mode);
      expect(projection.weeks.flatMap((w) => w.days).every((d) => d.autopay.endBalanceCents >= 0))
        .toBe(true);
    }
  });

  it('preserves paycheck locks across calendar changes, independently for each account and mode', () => {
    const data = {
      ...emptyBudget(),
      people: [
        paidPerson('A', 2026, 100000, {
          autopayLockedPerPaycheckCents: 5001, essentialsLockedPerPaycheckCents: 3047,
        }),
        paidPerson('B', 2026, 200000),
      ],
      bills: [
        bill({ name: 'Auto', amountCents: 100000, dueDay: 15, paidFrom: 'autopay' }),
        bill({ name: 'Shared', amountCents: 75000, dueDay: 22, paidFrom: 'shared' }),
      ],
    };
    const planStart = new Date(2026, 0, 1);
    const plan = computeFundingPlan(data, planStart);
    for (const mode of ['minimum', 'flat'] as const) {
      const allocationFor = createFundedAllocator(data, plan, mode);
      for (const month of plan.months) {
        const share = allocationFor(month).people[0];
        expect(share.autopayPerPaycheckCents).toBe(5001);
        expect(share.essentialsPerPaycheckCents).toBe(3047);
      }
      const projection = computeProjection({
        ...data, autopayBalanceCents: plan.autopay.openingFundsCents,
        essentialsBalanceCents: plan.essentials.openingFundsCents,
      }, planStart, 52, 'suggested', mode);
      expect(projection.weeks.flatMap((w) => w.days)
        .every((d) => d.autopay.endBalanceCents >= 0 && d.essentials.endBalanceCents >= 0)).toBe(true);
    }
  });

  it('keeps every contributor in daily and weekly projection data and excludes one-time income from their split', () => {
    const data = {
      ...budget(),
      oneOffs: [{
        id: 'bonus', kind: 'income' as const, name: 'Bonus', amountCents: 123,
        dateISO: '2026-10-07', account: 'autopay' as const, personId: null, note: '',
      }],
    };
    for (const mode of ['minimum', 'flat'] as const) {
      const projection = computeProjection(data, start, 5, 'suggested', mode);
      expect(projection.people.map((p) => p.name)).toEqual(['A', 'B', 'C']);
      const bonusWeek = projection.weeks.find((week) => week.days.some((day) => day.dateISO === '2026-10-07'));
      expect(bonusWeek).toBeDefined();
      expect(bonusWeek?.contributions).toHaveLength(3);
      expect(bonusWeek?.contributions[0].autopayCents).toBe(5000);
      expect(bonusWeek?.autopay.depositCents).toBe(
        (bonusWeek?.contributions.reduce((sum, p) => sum + p.autopayCents, 0) ?? 0) + 123,
      );
      for (const week of projection.weeks) {
        expect(week.contributions).toHaveLength(3);
        week.contributions.forEach((contribution, i) => {
          expect(contribution.autopayCents).toBe(
            week.days.reduce((sum, day) => sum + day.contributions[i].autopayCents, 0),
          );
        });
      }
    }
  });
});
