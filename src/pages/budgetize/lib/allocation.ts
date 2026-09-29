import type { BudgetData, DebtPaymentStrategy, MonthRef, PersonIncome } from '../types';
import { findMonthlyIncome, monthlyGrossCents, plannedDebtPaymentCents } from '../types';
import { getPaydays } from './paydays';
import { monthlyEquivalentCents } from './recurrence';

/** Split a total into per-person amounts proportional to weights, summing exactly. */
export function splitProportionally(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const effective = weightSum > 0 ? weights : weights.map(() => 1);
  const effectiveSum = weightSum > 0 ? weightSum : weights.length;
  if (effectiveSum === 0) return [];
  const shares: number[] = [];
  let cumulative = 0;
  let assigned = 0;
  for (const weight of effective) {
    cumulative += weight;
    const target = Math.round((totalCents * cumulative) / effectiveSum);
    shares.push(target - assigned);
    assigned = target;
  }
  return shares;
}

/** Steady-state monthly outflow, normalizing non-monthly frequencies and ignoring overrides. */
export function steadyMonthlyOutflowCents(
  data: BudgetData,
  paidFrom: 'shared' | 'autopay',
  strategy: DebtPaymentStrategy = 'suggested',
): number {
  const bills = data.bills.reduce(
    (sum, bill) =>
      bill.paidFrom === paidFrom ? sum + monthlyEquivalentCents(bill, bill.amountCents) : sum,
    0,
  );
  const debts = data.debts.reduce(
    (sum, debt) =>
      debt.paidFrom === paidFrom
        ? sum + monthlyEquivalentCents(debt, plannedDebtPaymentCents(debt, strategy))
        : sum,
    0,
  );
  return bills + debts;
}

export interface PersonMonthAllocation {
  personId: string;
  name: string;
  /** False when the person has no schedule entry for this month; every amount is then 0. */
  hasIncome: boolean;
  paycheckCount: number;
  grossPerPaycheckCents: number;
  grossMonthlyCents: number;
  autopayPerPaycheckCents: number;
  essentialsPerPaycheckCents: number;
  /** Whatever is left of the paycheck after the auto-pay and essentials carve-outs; may go negative. */
  personalPerPaycheckCents: number;
}

export interface MonthAllocation {
  month: MonthRef;
  /** True when at least one person has income data for this month. */
  hasIncome: boolean;
  autopayNeedCents: number;
  essentialsNeedCents: number;
  grossMonthlyCents: number;
  people: PersonMonthAllocation[];
}

/** Paydays in a month when the user has not supplied a count. */
export function defaultPaycheckCount(ref: MonthRef): number {
  return getPaydays(ref.year, ref.month).length;
}

/**
 * Splits each person's gross pay for one month into auto-pay funding, shared
 * essentials funding, and the personal remainder. The household's auto-pay and
 * essentials needs are sized from the bills and debts themselves, then divided
 * across people in proportion to their share of that month's gross pay.
 * Months with no schedule entry contribute nothing so the projection can leave
 * them blank rather than guessing.
 */
export function allocateMonth(
  data: BudgetData,
  ref: MonthRef,
  strategy: DebtPaymentStrategy = 'suggested',
): MonthAllocation {
  const entries = data.people.map((person) => findMonthlyIncome(person, ref));
  const grossMonthly = entries.map((entry) => (entry ? monthlyGrossCents(entry) : 0));
  const hasIncome = entries.some((entry) => entry !== null);

  const autopayNeedCents = hasIncome ? steadyMonthlyOutflowCents(data, 'autopay', strategy) : 0;
  const essentialsNeedCents = hasIncome ? steadyMonthlyOutflowCents(data, 'shared', strategy) : 0;
  const autopayShares = splitProportionally(autopayNeedCents, grossMonthly);
  const essentialsShares = splitProportionally(essentialsNeedCents, grossMonthly);

  const people: PersonMonthAllocation[] = data.people.map((person, i) => {
    const entry = entries[i];
    if (!entry) {
      return {
        personId: person.id,
        name: person.name,
        hasIncome: false,
        paycheckCount: defaultPaycheckCount(ref),
        grossPerPaycheckCents: 0,
        grossMonthlyCents: 0,
        autopayPerPaycheckCents: 0,
        essentialsPerPaycheckCents: 0,
        personalPerPaycheckCents: 0,
      };
    }
    const count = Math.max(1, entry.paycheckCount);
    const autopayPerPaycheckCents = Math.ceil((autopayShares[i] ?? 0) / count);
    const essentialsPerPaycheckCents = Math.ceil((essentialsShares[i] ?? 0) / count);
    return {
      personId: person.id,
      name: person.name,
      hasIncome: true,
      paycheckCount: entry.paycheckCount,
      grossPerPaycheckCents: entry.perPaycheckCents,
      grossMonthlyCents: grossMonthly[i],
      autopayPerPaycheckCents,
      essentialsPerPaycheckCents,
      personalPerPaycheckCents:
        entry.perPaycheckCents - autopayPerPaycheckCents - essentialsPerPaycheckCents,
    };
  });

  return {
    month: ref,
    hasIncome,
    autopayNeedCents,
    essentialsNeedCents,
    grossMonthlyCents: grossMonthly.reduce((a, b) => a + b, 0),
    people,
  };
}

/** Memoized `allocateMonth` for callers that walk many dates across a few months. */
export function createAllocator(data: BudgetData, strategy: DebtPaymentStrategy = 'suggested') {
  const cache = new Map<string, MonthAllocation>();
  return (ref: MonthRef): MonthAllocation => {
    const key = `${ref.year}-${ref.month}`;
    let allocation = cache.get(key);
    if (!allocation) {
      allocation = allocateMonth(data, ref, strategy);
      cache.set(key, allocation);
    }
    return allocation;
  };
}

/** Every month the budget has income data for, in calendar order. */
export function scheduledMonths(people: PersonIncome[]): MonthRef[] {
  const seen = new Map<string, MonthRef>();
  for (const person of people) {
    for (const entry of person.schedule) {
      seen.set(`${entry.year}-${entry.month}`, { year: entry.year, month: entry.month });
    }
  }
  return [...seen.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}
