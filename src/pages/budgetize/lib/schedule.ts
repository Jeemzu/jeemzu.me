import type { BudgetData, DebtPaymentStrategy } from '../types';
import { perPaydayDepositCents, perPaydayEssentialsCents, plannedDebtPaymentCents } from '../types';
import { getPaydays, resolveDueDay } from './paydays';
import { autopayPaydaySharesCents } from './autopay';

export { resolveDueDay } from './paydays';

export const UNCATEGORIZED = 'Uncategorized';
export const DEBT_CATEGORY = 'Debt';

export interface ScheduledItem {
  kind: 'bill' | 'debt';
  id: string;
  name: string;
  amountCents: number;
  /** Requested calendar day before any clamping. */
  dueDay: number;
  /** Actual day this month after clamping short months. */
  day: number;
  moved: boolean;
}

export interface CategoryTotal {
  category: string;
  totalCents: number;
  /** Fraction of the monthly outflow total, 0-1. */
  share: number;
}

export interface MonthSummary {
  paydays: number[];
  /** Everyone's deposits into all accounts this month. */
  incomeCents: number;
  /** Deposits into the shared essentials account this month. */
  essentialsIncomeCents: number;
  billsTotalCents: number;
  /** Planned debt payments (promo payoff or minimum). */
  debtsTotalCents: number;
  outflowTotalCents: number;
  /** Deposits carved out of essentials into the auto-pay account this month. */
  autopayFundingCents: number;
  /** Essentials deposits minus auto-pay funding and shared bills/debt payments. */
  remainingCents: number;
  perPaydayCents: number;
  scheduled: ScheduledItem[];
  categories: CategoryTotal[];
}

export function computeMonthSummary(
  data: BudgetData,
  year: number,
  month: number,
  strategy: DebtPaymentStrategy = 'suggested',
): MonthSummary {
  const paydays = getPaydays(year, month);
  const incomeCents = paydays.length * perPaydayDepositCents(data.people);
  const essentialsIncomeCents = paydays.length * perPaydayEssentialsCents(data.people);

  const items: { kind: 'bill' | 'debt'; id: string; name: string; amountCents: number; dueDay: number; category: string }[] = [
    ...data.bills.map((bill) => ({
      kind: 'bill' as const,
      id: bill.id,
      name: bill.name,
      amountCents: bill.amountCents,
      dueDay: bill.dueDay,
      category: bill.category.trim() || UNCATEGORIZED,
    })),
    ...data.debts.map((debt) => ({
      kind: 'debt' as const,
      id: debt.id,
      name: debt.name,
      amountCents: plannedDebtPaymentCents(debt, strategy),
      dueDay: debt.dueDay,
      category: DEBT_CATEGORY,
    })),
  ];

  const scheduled: ScheduledItem[] = items
    .map((item) => {
      const day = resolveDueDay(year, month, item.dueDay);
      return {
        kind: item.kind,
        id: item.id,
        name: item.name,
        amountCents: item.amountCents,
        dueDay: item.dueDay,
        day,
        moved: day !== item.dueDay,
      };
    })
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));

  const billsTotalCents = data.bills.reduce((sum, bill) => sum + bill.amountCents, 0);
  const debtsTotalCents = data.debts.reduce(
    (sum, debt) => sum + plannedDebtPaymentCents(debt, strategy),
    0,
  );
  const outflowTotalCents = billsTotalCents + debtsTotalCents;
  const autopayPerPaydayCents = autopayPaydaySharesCents(data, strategy).reduce((a, b) => a + b, 0);
  const autopayFundingCents = paydays.length * autopayPerPaydayCents;
  const sharedOutflowCents =
    data.bills.reduce((sum, bill) => (bill.paidFrom === 'shared' ? sum + bill.amountCents : sum), 0) +
    data.debts.reduce(
      (sum, debt) => (debt.paidFrom === 'shared' ? sum + plannedDebtPaymentCents(debt, strategy) : sum),
      0,
    );
  const remainingCents = essentialsIncomeCents - autopayFundingCents - sharedOutflowCents;
  const perPaydayCents = paydays.length > 0 ? Math.round(remainingCents / paydays.length) : 0;

  const byCategory = new Map<string, number>();
  for (const item of items) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amountCents);
  }
  const categories: CategoryTotal[] = [...byCategory.entries()]
    .map(([category, totalCents]) => ({
      category,
      totalCents,
      share: outflowTotalCents > 0 ? totalCents / outflowTotalCents : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents || a.category.localeCompare(b.category));

  return {
    paydays,
    incomeCents,
    essentialsIncomeCents,
    billsTotalCents,
    debtsTotalCents,
    outflowTotalCents,
    autopayFundingCents,
    remainingCents,
    perPaydayCents,
    scheduled,
    categories,
  };
}
