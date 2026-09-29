import type { BudgetData, DebtPaymentStrategy, MonthRef } from '../types';
import type { AutopayPlan } from './autopay';
import { allocateMonth } from './allocation';
import { formatMoney } from './money';
import { monthLabel, parseMonthRef } from './paydays';
import type { Projection, ProjectionWeek } from './projection';

export interface FundingWarning {
  severity: 'error' | 'warn';
  message: string;
}

/**
 * Flags every way the funding plan fails to add up: months the projection covers
 * with no income data, paychecks too small for their auto-pay and essentials
 * carve-outs, projected negative balances, and missing auto-pay opening funds.
 * Errors come first.
 */
export function computeFundingWarnings(
  data: BudgetData,
  projection: Projection,
  plan: AutopayPlan,
  strategy: DebtPaymentStrategy = 'suggested',
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

  const blankMonths = months.filter((ref) => !allocateMonth(data, ref, strategy).hasIncome);
  if (data.people.length > 0 && blankMonths.length > 0) {
    warnings.push({
      severity: 'warn',
      message: `No income data for ${blankMonths.map(monthLabel).join(', ')}, so those weeks show no deposits. Add the months to each person's pay schedule.`,
    });
  }

  for (const ref of months) {
    const allocation = allocateMonth(data, ref, strategy);
    if (!allocation.hasIncome) continue;
    for (const person of allocation.people) {
      if (!person.hasIncome || person.personalPerPaycheckCents >= 0) continue;
      warnings.push({
        severity: 'error',
        message: `${person.name}'s ${monthLabel(ref)} paycheck can't cover their share of the bills: ${formatMoney(person.grossPerPaycheckCents)} gross is less than the ${formatMoney(person.autopayPerPaycheckCents + person.essentialsPerPaycheckCents)} auto-pay plus essentials carve-out, so nothing is left for personal spending.`,
      });
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

  if (plan.bufferCents > 0) {
    warnings.push({
      severity: 'warn',
      message: `The auto-pay account needs ${formatMoney(plan.bufferCents)} in opening funds beyond its current balance to never dip negative (simulated from ${plan.simStartISO}).`,
    });
  }

  return warnings.sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'));
}
