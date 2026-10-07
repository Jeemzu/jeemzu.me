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
  /** Display in the Subscriptions section; omitted on older bills. Billing behavior is unchanged. */
  isSubscription?: boolean;
  amountCents: number;
  /** Calendar day 1-31; days beyond a month's end land on its last day. Ignored for weekly and biweekly. */
  dueDay: number;
  paidFrom: AccountSource;
}

/** One month of gross pay for one person. Months with no entry have no known income. */
export interface MonthlyIncome {
  year: number;
  /** 0-based month index. */
  month: number;
  /** Paydays in the month; imported from the sheet, otherwise the Wednesday count. */
  paycheckCount: number;
  /** Gross deposit landing on each of those paydays. */
  perPaycheckCents: number;
}

export interface PersonIncome {
  id: string;
  name: string;
  /** Gross pay per month; months absent from this list are left blank in the projection. */
  schedule: MonthlyIncome[];
  /** Current personal checking balance — the projection starting point. */
  personalBalanceCents: number;
  /** Null/omitted means proportional funding; zero is a locked $0 contribution. */
  autopayLockedMonthlyCents?: number | null;
  essentialsLockedMonthlyCents?: number | null;
}

export interface DebtAccount extends Recurrence {
  id: string;
  name: string;
  balanceCents: number;
  minPaymentCents: number;
  /** Promo payoff amount (balance ÷ months left); null when the sheet has none. */
  suggestedPaymentCents: number | null;
  hasPromotion: boolean;
  /** Used only to rank payoff priority — no interest is projected. */
  interestRateBps: number | null;
  promoEndISO: string | null;
  postPromoRateBps: number | null;
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
  /** yyyy-mm-dd the balances are as of and projections start from; null means today. */
  projectionStartISO: string | null;
  debtStrategy: DebtPaymentStrategy;
}

export interface MonthRef {
  year: number;
  /** 0-based month index. */
  month: number;
}

/** Person data as it comes from a workbook import (no id or balance yet). */
export interface ImportedPerson {
  name: string;
  schedule: MonthlyIncome[];
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

/** The person's gross pay entry for a month, or null when that month has no income data. */
export function findMonthlyIncome(person: PersonIncome, ref: MonthRef): MonthlyIncome | null {
  return (
    person.schedule.find((entry) => entry.year === ref.year && entry.month === ref.month) ?? null
  );
}

export function monthlyGrossCents(entry: MonthlyIncome): number {
  return entry.perPaycheckCents * entry.paycheckCount;
}

export function compareMonthlyIncome(a: MonthlyIncome, b: MonthlyIncome): number {
  return a.year - b.year || a.month - b.month;
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
    projectionStartISO: null,
    debtStrategy: 'suggested',
  };
}

/** Recurrence defaults for items created before frequencies existed. */
export function monthlyRecurrence(): Recurrence {
  return { frequency: 'monthly', anchorISO: null, startISO: null, endISO: null };
}
