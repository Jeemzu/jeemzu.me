/** Which checking account a bill or debt payment is drafted from. */
export type AccountSource = 'shared' | 'autopay';

export type RecurrenceFrequency = 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual';

/**
 * Recurrence shared by bills and debts. `anchorISO` is the first occurrence and
 * is required for every frequency except monthly; `startISO`/`endISO` bound the
 * span the item is active at all (inclusive, null means unbounded).
 */
export interface Recurrence {
  frequency: RecurrenceFrequency;
  anchorISO: string | null;
  startISO: string | null;
  endISO: string | null;
}

export interface Bill extends Recurrence {
  id: string;
  name: string;
  amountCents: number;
  /** Calendar day 1-31; days beyond a month's end land on its last day. Ignored for weekly and biweekly. */
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

export interface DebtAccount extends Recurrence {
  id: string;
  name: string;
  balanceCents: number;
  minPaymentCents: number;
  /** Promo payoff amount (balance ÷ months left); null when the sheet has none. */
  suggestedPaymentCents: number | null;
  hasPromotion: boolean;
  /** Calendar day 1-31; days beyond a month's end land on its last day. Ignored for weekly and biweekly. */
  dueDay: number;
  paidFrom: AccountSource;
}

/**
 * A temporary change to one bill or debt over an inclusive date range — either
 * skipping it entirely or charging a different amount. Leaves the underlying
 * item untouched so it resumes on its own once the range ends.
 */
export interface ScheduleOverride {
  id: string;
  targetKind: 'bill' | 'debt';
  targetId: string;
  /** Inclusive ISO date range (yyyy-mm-dd) the override covers. */
  fromISO: string;
  toISO: string;
  mode: 'skip' | 'amount';
  /** Replacement amount; null when mode is 'skip'. */
  amountCents: number | null;
  /** Free-text reason, shown in the UI and used by the assistant. */
  note: string;
}

/** Which account a one-off lands in. 'personal' requires a `personId`. */
export type OneOffAccount = AccountSource | 'personal';

/** A single dated expense or deposit that does not repeat. */
export interface OneOffEvent {
  id: string;
  kind: 'expense' | 'income';
  name: string;
  amountCents: number;
  dateISO: string;
  account: OneOffAccount;
  /** Required when account is 'personal'; null otherwise. */
  personId: string | null;
  note: string;
}

export interface BudgetData {
  people: PersonIncome[];
  bills: Bill[];
  debts: DebtAccount[];
  overrides: ScheduleOverride[];
  oneOffs: OneOffEvent[];
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
  return {
    people: [],
    bills: [],
    debts: [],
    overrides: [],
    oneOffs: [],
    essentialsBalanceCents: 0,
    autopayBalanceCents: 0,
  };
}

/** Recurrence defaults for items created before frequencies existed. */
export function monthlyRecurrence(): Recurrence {
  return { frequency: 'monthly', anchorISO: null, startISO: null, endISO: null };
}
