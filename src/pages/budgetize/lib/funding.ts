import type { AccountSource, BudgetData, DebtPaymentStrategy, MonthRef } from '../types';
import {
  addToNeed,
  allocateMonth,
  emptyNeed,
  scheduledMonths,
  splitProportionally,
  type AccountNeed,
  type AllocationResolver,
  type MonthAllocation,
} from './allocation';
import { entriesOn } from './ledger';
import { addMonths, daysInMonth, PAYDAY_WEEKDAY, toISODate } from './paydays';
import { paycheckLock, unlockedShares } from './contributions';

/** Which deposit amounts drive the projection: each month's minimum, or one flat weekly amount. */
export type DepositMode = 'minimum' | 'flat';

export interface AccountMonthPlan {
  month: MonthRef;
  hasIncome: boolean;
  /** Wednesdays inside the plan window this month. */
  paydayCount: number;
  /** Charges inside the plan window (the first month starts at the plan start). */
  need: AccountNeed;
  /** Smallest deposit per payday that keeps the balance from going negative; 0 without income. */
  minPerPaydayCents: number;
  /** Parallel to `data.people`. */
  minShares: number[];
  /** Flat-mode shares for this month, preserving each person's per-paycheck lock. */
  flatShares: number[];
  shortfallCents: number;
  excessCents: number;
  /** Balance at the end of the month under minimum deposits. */
  endBalanceCents: number;
}

export interface AccountFunding {
  account: AccountSource;
  months: AccountMonthPlan[];
  /** Smallest single Wednesday deposit that keeps the balance from going negative across the plan. */
  flatPerPaydayCents: number;
  /** Parallel to `data.people`, split by share of total gross pay across the plan. */
  flatShares: number[];
  /** Balance to add now so charges due before the first deposit don't overdraw. */
  openingFundsCents: number;
}

export interface FundingPlan {
  startISO: string;
  months: MonthRef[];
  autopay: AccountFunding;
  essentials: AccountFunding;
}

interface Day {
  monthIndex: number;
  isPayday: boolean;
  /** A payday in a month with income, so deposits land (after that day's charges). */
  deposits: boolean;
}

interface Timeline {
  months: MonthRef[];
  allocations: MonthAllocation[];
  days: Day[];
  /** Each person's gross pay summed across the plan's months. */
  totalGross: number[];
}

/** Smallest whole-cent deposit per payday covering a shortfall; never negative. */
function perDeposit(shortfallCents: number, deposits: number): number {
  return Math.max(0, Math.ceil(shortfallCents / deposits));
}

function planAccount(
  data: BudgetData,
  account: AccountSource,
  openingBalanceCents: number,
  timeline: Timeline,
  start: Date,
  strategy: DebtPaymentStrategy,
): AccountFunding {
  const { months, allocations, days, totalGross } = timeline;
  const locks = data.people.map((person) => paycheckLock(person, account));
  const hasLocks = locks.some((lock) => lock !== null);
  const eligible = allocations.map((allocation) => allocation.people.map((p) => p.hasIncome));
  const canAdjust = eligible.map((people) => people.some((known, i) => known && locks[i] === null));
  const lockedByDay = days.map((day) => {
    if (!day.deposits) return 0;
    return locks.reduce<number>((sum, lock, i) =>
      sum + (lock !== null && eligible[day.monthIndex][i] ? lock : 0), 0);
  });
  const sharesFor = (unlocked: number, i: number, weights: number[]) => {
    const shares = unlockedShares(unlocked, weights, eligible[i], locks);
    return shares.map((share, p) =>
      locks[p] !== null && eligible[i][p] ? locks[p] : share);
  };
  const needs = months.map(() => emptyNeed());
  // Charges minus one-off deposits for this account, per day.
  const net = days.map((day, t) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + t);
    const { outflows, inflows } = entriesOn(data, date, strategy);
    let cents = 0;
    for (const entry of outflows) {
      if (entry.source !== account) continue;
      addToNeed(needs[day.monthIndex], entry.kind, entry.amountCents);
      cents += entry.amountCents;
    }
    for (const entry of inflows) {
      if (entry.source === account) cents -= entry.amountCents;
    }
    return cents;
  });

  const firstDeposit = days.findIndex((d) => d.deposits);
  const preDepositEnd = firstDeposit === -1 ? days.length - 1 : firstDeposit;
  let running = 0;
  let peak = 0;
  for (let t = 0; t <= preDepositEnd; t++) {
    running += net[t];
    peak = Math.max(peak, running);
  }
  const openingFundsCents = Math.max(0, peak - openingBalanceCents);
  const funded = openingBalanceCents + openingFundsCents;

  // What a month must leave behind so charges before the next deposit clear.
  const reserveAfter = (lastDay: number): number => {
    let ahead = 0;
    let most = 0;
    for (let t = lastDay + 1; t < days.length; t++) {
      ahead += net[t];
      most = Math.max(most, ahead);
      if (days[t].deposits) break;
    }
    return most;
  };

  let carry = funded;
  let t = 0;
  const monthPlans = months.map((month, i): AccountMonthPlan => {
    let spent = 0;
    let deposits = 0;
    let paydayCount = 0;
    let perPayday = 0;
    let lockedReceived = 0;
    let uncovered = 0;
    for (; t < days.length && days[t].monthIndex === i; t++) {
      spent += net[t];
      uncovered = Math.max(uncovered, spent - carry - lockedReceived);
      if (deposits > 0) {
        perPayday = Math.max(perPayday, perDeposit(spent - carry - lockedReceived, deposits));
      }
      if (days[t].isPayday) paydayCount++;
      if (days[t].deposits) deposits++;
      lockedReceived += lockedByDay[t];
    }
    if (deposits > 0) {
      perPayday = Math.max(
        perPayday,
        perDeposit(spent + reserveAfter(t - 1) - carry - lockedReceived, deposits),
      );
    }
    uncovered = Math.max(uncovered, spent + reserveAfter(t - 1) - carry - lockedReceived);
    const unlocked = canAdjust[i] ? perPayday : 0;
    const shortfallCents = canAdjust[i] ? 0 : uncovered;
    const excessCents = Math.max(0, carry + lockedReceived - spent - reserveAfter(t - 1));
    carry += lockedReceived + unlocked * deposits - spent;
    const allocation = allocations[i];
    const minShares = hasLocks
      ? sharesFor(unlocked, i, allocation.people.map((p) => p.grossMonthlyCents))
      : splitProportionally(perPayday, allocation.people.map((p) => p.grossMonthlyCents));
    return {
      month,
      hasIncome: allocation.hasIncome,
      paydayCount,
      need: needs[i],
      minPerPaydayCents: minShares.reduce((sum, share) => sum + share, 0),
      minShares,
      flatShares: [],
      shortfallCents,
      excessCents: hasLocks && lockedReceived > 0 && perPayday === 0 ? excessCents : 0,
      endBalanceCents: carry,
    };
  });

  let spent = 0;
  let deposits = 0;
  let flat = 0;
  let lockedReceived = 0;
  for (let d = 0; d < days.length; d++) {
    spent += net[d];
    if (deposits > 0) flat = Math.max(flat, perDeposit(spent - funded - lockedReceived, deposits));
    lockedReceived += lockedByDay[d];
    if (days[d].deposits && (!hasLocks || canAdjust[days[d].monthIndex])) deposits++;
  }
  const legacyFlatShares = splitProportionally(flat, totalGross);
  monthPlans.forEach((month, i) => {
    month.flatShares = hasLocks ? sharesFor(flat, i, totalGross) : legacyFlatShares;
  });
  const flatShares = monthPlans[0]?.flatShares ?? data.people.map(() => 0);

  return {
    account,
    months: monthPlans,
    flatPerPaydayCents: flatShares.reduce((sum, share) => sum + share, 0),
    flatShares,
    openingFundsCents,
  };
}

function buildTimeline(data: BudgetData, start: Date, strategy: DebtPaymentStrategy): Timeline {
  const scheduled = scheduledMonths(data.people);
  const last = scheduled[scheduled.length - 1];
  const months: MonthRef[] = [];
  if (last) {
    for (
      let ref: MonthRef = { year: start.getFullYear(), month: start.getMonth() };
      ref.year < last.year || (ref.year === last.year && ref.month <= last.month);
      ref = addMonths(ref, 1)
    ) {
      months.push(ref);
    }
  }
  const allocations = months.map((ref) => allocateMonth(data, ref, strategy));
  const days: Day[] = [];
  months.forEach((ref, monthIndex) => {
    const first = monthIndex === 0 ? start.getDate() : 1;
    const lastDay = daysInMonth(ref.year, ref.month);
    for (let day = first; day <= lastDay; day++) {
      const isPayday = new Date(ref.year, ref.month, day).getDay() === PAYDAY_WEEKDAY;
      days.push({ monthIndex, isPayday, deposits: isPayday && allocations[monthIndex].hasIncome });
    }
  });
  const totalGross = data.people.map((_, i) =>
    allocations.reduce((sum, a) => sum + (a.people[i]?.grossMonthlyCents ?? 0), 0),
  );
  return { months, allocations, days, totalGross };
}

/**
 * Sizes the auto-pay and essentials deposits from `start` through the last month
 * with pay entered, walking every charge by date. Charges on a payday clear before
 * that day's deposit. Both the monthly minimums and the flat amount assume the
 * opening funds are added first.
 */
export function computeFundingPlan(
  data: BudgetData,
  start: Date,
  strategy: DebtPaymentStrategy = 'suggested',
): FundingPlan {
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const timeline = buildTimeline(data, startDate, strategy);
  return {
    startISO: toISODate(startDate),
    months: timeline.months,
    autopay: planAccount(data, 'autopay', data.autopayBalanceCents, timeline, startDate, strategy),
    essentials: planAccount(data, 'shared', data.essentialsBalanceCents, timeline, startDate, strategy),
  };
}

/**
 * Month allocations with auto-pay and essentials deposits taken from the funding
 * plan in the chosen mode; months outside the plan fall back to need ÷ paychecks.
 */
export function createFundedAllocator(
  data: BudgetData,
  plan: FundingPlan,
  mode: DepositMode,
  strategy: DebtPaymentStrategy = 'suggested',
): AllocationResolver {
  const index = new Map(plan.months.map((ref, i) => [`${ref.year}-${ref.month}`, i]));
  const cache = new Map<string, MonthAllocation>();
  return (ref) => {
    const key = `${ref.year}-${ref.month}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const base = allocateMonth(data, ref, strategy);
    const i = index.get(key);
    let allocation = base;
    if (i !== undefined && base.hasIncome) {
      const sharesFor = (funding: AccountFunding) =>
        mode === 'flat' ? funding.months[i].flatShares : funding.months[i].minShares;
      const autopay = sharesFor(plan.autopay);
      const essentials = sharesFor(plan.essentials);
      allocation = {
        ...base,
        people: base.people.map((person, p) => {
          const autopayPerPaycheckCents = autopay[p] ?? 0;
          const essentialsPerPaycheckCents = essentials[p] ?? 0;
          return {
            ...person,
            autopayPerPaycheckCents,
            essentialsPerPaycheckCents,
            personalPerPaycheckCents:
              person.grossPerPaycheckCents - autopayPerPaycheckCents - essentialsPerPaycheckCents,
          };
        }),
      };
    }
    cache.set(key, allocation);
    return allocation;
  };
}

/** Funding plan plus the allocator for one mode, for callers that only need the deposits. */
export function fundedAllocator(
  data: BudgetData,
  start: Date,
  mode: DepositMode,
  strategy: DebtPaymentStrategy = 'suggested',
): AllocationResolver {
  return createFundedAllocator(data, computeFundingPlan(data, start, strategy), mode, strategy);
}
