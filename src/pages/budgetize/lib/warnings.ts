import type { BudgetData, MonthRef } from '../types';
import type { AllocationResolver } from './allocation';
import type { FundingPlan } from './funding';
import { formatMoney } from './money';
import { monthLabel, parseMonthRef } from './paydays';
import type { Projection, ProjectionWeek } from './projection';
import { paycheckLock } from './contributions';

export interface FundingWarning {
  severity: 'error' | 'warn';
  message: string;
}

/**
 * Flags every way the funding plan fails to add up: months the projection covers
 * with no income data, paychecks too small for their auto-pay and essentials
 * carve-outs, projected negative balances, and missing opening funds.
 * Errors come first.
 */
export function computeFundingWarnings(
  data: BudgetData,
  projection: Projection,
  plan: FundingPlan,
  allocationFor: AllocationResolver,
): FundingWarning[] {
  const warnings: FundingWarning[] = [];

  const months: MonthRef[] = [];
  const seen = new Set<string>();
  for (const week of projection.weeks) {
    for (const iso of [week.startISO, week.endISO]) {
      const ref = parseMonthRef(iso);
      if (!ref) continue;
      const key = `${ref.year}-${ref.month}`;
      if (seen.has(key)) continue;
      seen.add(key);
      months.push(ref);
    }
  }

  const blankMonths = months.filter((ref) => !allocationFor(ref).hasIncome);
  if (data.people.length > 0 && blankMonths.length > 0) {
    warnings.push({
      severity: 'warn',
      message: `No income data for ${blankMonths.map(monthLabel).join(', ')}, so those weeks show no deposits. Add the months to each person's pay schedule.`,
    });
  }

  for (const ref of months) {
    const allocation = allocationFor(ref);
    if (!allocation.hasIncome) continue;
    for (const person of data.people) {
      if (person.schedule.some((entry) => entry.year === ref.year && entry.month === ref.month)) continue;
      if (paycheckLock(person, 'autopay') === null && paycheckLock(person, 'shared') === null) continue;
      warnings.push({
        severity: 'warn',
        message: `${person.name} has a per-paycheck contribution lock but no entered pay for ${monthLabel(ref)}, so their locked contributions are not deposited that month.`,
      });
    }
    for (const person of allocation.people) {
      if (!person.hasIncome || person.personalPerPaycheckCents >= 0) continue;
      warnings.push({
        severity: 'error',
        message: `${person.name}'s ${monthLabel(ref)} paycheck can't cover their share of the bills: ${formatMoney(person.grossPerPaycheckCents)} gross is less than the ${formatMoney(person.autopayPerPaycheckCents + person.essentialsPerPaycheckCents)} auto-pay plus essentials carve-out, so nothing is left for personal spending.`,
      });
    }
    const monthIndex = plan.months.findIndex((month) => month.year === ref.year && month.month === ref.month);
    if (monthIndex === -1) continue;
    for (const [label, funding] of [['auto-pay', plan.autopay], ['essentials', plan.essentials]] as const) {
      const month = funding.months[monthIndex];
      if (month.shortfallCents > 0) {
        warnings.push({
          severity: 'error',
          message: `All people with entered pay are locked for ${label} in ${monthLabel(ref)}. The monthly minimum plan is short ${formatMoney(month.shortfallCents)}; unlock someone, increase a fixed contribution, or add funds. Locked amounts have not changed.`,
        });
      }
      if (month.excessCents > 0) {
        warnings.push({
          severity: 'warn',
          message: `Fixed ${label} contributions and existing funds exceed the monthly minimum requirement in ${monthLabel(ref)} by ${formatMoney(month.excessCents)}. Unlocked contributions are $0 in minimum mode; locked amounts have not changed.`,
        });
      }
    }
  }

  const accounts: { label: string; balance: (week: ProjectionWeek) => number }[] = [
    ...projection.people.map((person, i) => ({
      label: `${person.name}'s personal account`,
      balance: (week: ProjectionWeek) => week.personal[i]?.endBalanceCents ?? 0,
    })),
    { label: 'The shared essentials account', balance: (week) => week.essentials.endBalanceCents },
    { label: 'The auto-pay account', balance: (week) => week.autopay.endBalanceCents },
  ];
  for (const account of accounts) {
    const firstNegative = projection.weeks.find((week) => account.balance(week) < 0);
    if (firstNegative) {
      warnings.push({
        severity: 'warn',
        message: `${account.label} is projected to go negative the week of ${firstNegative.startISO}.`,
      });
    }
  }

  for (const [label, funding] of [
    ['auto-pay', plan.autopay],
    ['essentials', plan.essentials],
  ] as const) {
    if (funding.openingFundsCents <= 0) continue;
    warnings.push({
      severity: 'warn',
      message: `The ${label} account needs ${formatMoney(funding.openingFundsCents)} in opening funds beyond its current balance to cover charges due before the first deposit (planned from ${plan.startISO}).`,
    });
  }

  return warnings.sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'));
}
