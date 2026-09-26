import type { BudgetData, DebtPaymentStrategy } from '../types';
import { perPaydayEssentialsCents, plannedDebtPaymentCents } from '../types';
import type { AutopayPlan } from './autopay';
import { autopayPaydaySharesCents } from './autopay';
import { formatMoney } from './money';
import type { Projection, ProjectionWeek } from './projection';

export interface FundingWarning {
  severity: 'error' | 'warn';
  message: string;
}

/**
 * Flags every way the funding plan fails to add up: paychecks too small for
 * their auto-pay share, essentials underfunded for shared bills, projected
 * negative balances, and missing auto-pay opening funds. Errors come first.
 */
export function computeFundingWarnings(
  data: BudgetData,
  projection: Projection,
  plan: AutopayPlan,
  strategy: DebtPaymentStrategy = 'suggested',
): FundingWarning[] {
  const warnings: FundingWarning[] = [];
  const shares = autopayPaydaySharesCents(data, strategy);

  // Gross = personal + essentials, so a share above the essentials contribution
  // also means the paycheck can't cover personal deposit + auto-pay share.
  data.people.forEach((person, i) => {
    const share = shares[i] ?? 0;
    if (share > person.essentialsPerPaycheckCents) {
      warnings.push({
        severity: 'error',
        message: `${person.name}'s paycheck can't cover their auto-pay share: ${formatMoney(share)}/payday is more than their ${formatMoney(person.essentialsPerPaycheckCents)} essentials contribution, so their essentials deposit goes negative.`,
      });
    }
  });

  const essentialsMonthlyCents = 4 * perPaydayEssentialsCents(data.people);
  const autopayMonthlyCents = 4 * shares.reduce((a, b) => a + b, 0);
  const sharedMonthlyCents =
    data.bills.reduce((sum, bill) => (bill.paidFrom === 'shared' ? sum + bill.amountCents : sum), 0) +
    data.debts.reduce(
      (sum, debt) => (debt.paidFrom === 'shared' ? sum + plannedDebtPaymentCents(debt, strategy) : sum),
      0,
    );
  if (essentialsMonthlyCents < autopayMonthlyCents + sharedMonthlyCents) {
    warnings.push({
      severity: 'error',
      message: `In a 4-payday month, essentials deposits (${formatMoney(essentialsMonthlyCents)}) don't cover auto-pay funding (${formatMoney(autopayMonthlyCents)}) plus shared bills and debts (${formatMoney(sharedMonthlyCents)}).`,
    });
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

  return warnings;
}
