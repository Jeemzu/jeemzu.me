/** Which checking account a bill or debt payment is drafted from. */
export type AccountSource = 'shared' | 'autopay';

export interface Bill {
  id: string;
  name: string;
  amountCents: number;
  /** Calendar day 1-31; days beyond a month's end land on its last day. */
  dueDay: number;
  /** Empty string means uncategorized. */
  category: string;
  paidFrom: AccountSource;
}

export interface PersonIncome {
  id: string;
  name: string;
  /** Deposit into their own checking account each Wednesday paycheck. */
  personalPerPaycheckCents: number;
  /** Deposit into the shared essentials account each Wednesday paycheck. */
  essentialsPerPaycheckCents: number;
  /** Current personal checking balance — the projection starting point. */
  personalBalanceCents: number;
}

export interface DebtAccount {
  id: string;
  name: string;
  balanceCents: number;
  minPaymentCents: number;
  /** Promo payoff amount (balance ÷ months left); null when the sheet has none. */
  suggestedPaymentCents: number | null;
  hasPromotion: boolean;
  /** Calendar day 1-31; days beyond a month's end land on its last day. */
  dueDay: number;
  paidFrom: AccountSource;
}

export interface BudgetData {
  people: PersonIncome[];
  bills: Bill[];
  debts: DebtAccount[];
  /** Current shared essentials account balance — the projection starting point. */
  essentialsBalanceCents: number;
  /** Current auto-pay account balance — the projection starting point. */
  autopayBalanceCents: number;
}

export interface MonthRef {
  year: number;
  /** 0-based month index. */
  month: number;
}

/** Person data as it comes from a workbook import (no id or balance yet). */
export interface ImportedPerson {
  name: string;
  personalPerPaycheckCents: number;
  essentialsPerPaycheckCents: number;
}

/** Which debt payment amount budgeting math should use. */
export type DebtPaymentStrategy = 'suggested' | 'minimum';

/** Monthly amount budgeted for a debt: promo payoff when active (suggested strategy), else the minimum. */
export function plannedDebtPaymentCents(
  debt: DebtAccount,
  strategy: DebtPaymentStrategy = 'suggested',
): number {
  if (strategy === 'minimum') return debt.minPaymentCents;
  return debt.hasPromotion && debt.suggestedPaymentCents !== null
    ? debt.suggestedPaymentCents
    : debt.minPaymentCents;
}

/** Sum of everyone's deposits (personal + essentials) landing on one payday. */
export function perPaydayDepositCents(people: PersonIncome[]): number {
  return people.reduce(
    (sum, p) => sum + p.personalPerPaycheckCents + p.essentialsPerPaycheckCents,
    0,
  );
}

/** Sum of everyone's essentials-account deposits landing on one payday. */
export function perPaydayEssentialsCents(people: PersonIncome[]): number {
  return people.reduce((sum, p) => sum + p.essentialsPerPaycheckCents, 0);
}

export function emptyBudget(): BudgetData {
  return { people: [], bills: [], debts: [], essentialsBalanceCents: 0, autopayBalanceCents: 0 };
}
