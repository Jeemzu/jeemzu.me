import type { BudgetData, DebtAccount, DebtPaymentStrategy, MonthRef } from '../types';
import { daysInMonth } from './paydays';
import { paycheckLock } from './contributions';
import { createFundedAllocator, type DepositMode, type FundingPlan } from './funding';
import { entriesOn } from './ledger';
import { debtAmountOn } from './recurrence';
import { rankDebtPriority } from './debtPriority';

export interface DebtExtraAllocation {
  debtId: string;
  debtName: string;
  effectiveRateBps: number;
  monthlyExtraCents: number;
}

export type DebtRecommendationStatus =
  | 'no-debts'
  | 'no-income-forecast'
  | 'no-surplus'
  | 'missing-rates'
  | 'no-balance-after-plan'
  | 'ready';

export interface DebtPayoffRecommendation {
  status: DebtRecommendationStatus;
  monthlyAvailableCents: number;
  allocations: DebtExtraAllocation[];
}

function monthIndex(ref: MonthRef): number {
  return ref.year * 12 + ref.month;
}

function unlockedPersonalRemainderCents(
  data: BudgetData,
  month: MonthRef,
  strategy: DebtPaymentStrategy,
  allocationFor: ReturnType<typeof createFundedAllocator>,
): number {
  const allocation = allocationFor(month);
  if (!allocation.hasIncome) return 0;

  const unlockedIds = new Set(
    data.people
      .filter(
        (person) =>
          paycheckLock(person, 'autopay') === null &&
          paycheckLock(person, 'shared') === null,
      )
      .map((person) => person.id),
  );
  let availableCents = allocation.people.reduce(
    (sum, person) =>
      unlockedIds.has(person.personId)
        ? sum + person.personalPerPaycheckCents * person.paycheckCount
        : sum,
    0,
  );

  const days = daysInMonth(month.year, month.month);
  for (let day = 1; day <= days; day++) {
    const entries = entriesOn(data, new Date(month.year, month.month, day), strategy);
    availableCents -= entries.outflows.reduce(
      (sum, entry) =>
        entry.kind === 'one-off' &&
        entry.source === 'personal' &&
        entry.personId !== null &&
        unlockedIds.has(entry.personId)
          ? sum + entry.amountCents
          : sum,
      0,
    );
  }
  return Math.max(0, availableCents);
}

function scheduledDebtPaymentCents(
  debt: DebtAccount,
  month: MonthRef,
  data: BudgetData,
  strategy: DebtPaymentStrategy,
): number {
  let total = 0;
  const days = daysInMonth(month.year, month.month);
  for (let day = 1; day <= days; day++) {
    const amount = debtAmountOn(
      debt,
      new Date(month.year, month.month, day),
      data.overrides,
      strategy,
    );
    if (amount !== null) total += amount;
  }
  return total;
}

export function computeDebtPayoffRecommendation(
  data: BudgetData,
  start: Date,
  plan: FundingPlan,
  mode: DepositMode,
  strategy: DebtPaymentStrategy,
): DebtPayoffRecommendation {
  const outstanding = data.debts.filter((debt) => debt.balanceCents > 0);
  if (outstanding.length === 0) {
    return { status: 'no-debts', monthlyAvailableCents: 0, allocations: [] };
  }

  const firstFullMonth = new Date(
    start.getFullYear(),
    start.getMonth() + (start.getDate() > 1 ? 1 : 0),
    1,
  );
  const firstMonthIndex = monthIndex({
    year: firstFullMonth.getFullYear(),
    month: firstFullMonth.getMonth(),
  });
  const forecastMonths = plan.months.filter((month) => monthIndex(month) >= firstMonthIndex);
  if (forecastMonths.length === 0) {
    return { status: 'no-income-forecast', monthlyAvailableCents: 0, allocations: [] };
  }

  const allocationFor = createFundedAllocator(data, plan, mode, strategy);
  const monthlySurpluses = forecastMonths.map((month) => {
    let availableCents = unlockedPersonalRemainderCents(data, month, strategy, allocationFor);
    if (monthIndex(month) === monthIndex(plan.months[0])) {
      availableCents -= plan.autopay.openingFundsCents + plan.essentials.openingFundsCents;
    }
    return Math.max(0, availableCents);
  });
  const monthlyAvailableCents = Math.min(...monthlySurpluses);
  if (monthlyAvailableCents <= 0) {
    return { status: 'no-surplus', monthlyAvailableCents: 0, allocations: [] };
  }

  if (outstanding.some((debt) => debt.interestRateBps === null)) {
    return { status: 'missing-rates', monthlyAvailableCents, allocations: [] };
  }

  const priorities = rankDebtPriority(outstanding, start);
  const ordered = [...outstanding].sort(
    (a, b) =>
      (priorities.get(a.id)?.rank ?? Number.MAX_SAFE_INTEGER) -
      (priorities.get(b.id)?.rank ?? Number.MAX_SAFE_INTEGER),
  );
  const firstMonth = forecastMonths[0];
  let remainingCents = monthlyAvailableCents;
  const allocations: DebtExtraAllocation[] = [];

  for (const debt of ordered) {
    const plannedCents = scheduledDebtPaymentCents(debt, firstMonth, data, strategy);
    const headroomCents = Math.max(0, debt.balanceCents - plannedCents);
    const monthlyExtraCents = Math.min(remainingCents, headroomCents);
    if (monthlyExtraCents <= 0) continue;
    allocations.push({
      debtId: debt.id,
      debtName: debt.name,
      effectiveRateBps: priorities.get(debt.id)?.effectiveRateBps ?? 0,
      monthlyExtraCents,
    });
    remainingCents -= monthlyExtraCents;
    if (remainingCents === 0) break;
  }

  return {
    status: allocations.length > 0 ? 'ready' : 'no-balance-after-plan',
    monthlyAvailableCents,
    allocations,
  };
}
