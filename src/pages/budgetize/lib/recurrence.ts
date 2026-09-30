import type {
  Bill,
  DebtAccount,
  DebtPaymentStrategy,
  Recurrence,
  RecurrenceFrequency,
  ScheduleOverride,
} from '../types';
import { plannedDebtPaymentCents } from '../types';
import { daysInMonth, resolveDueDay, toISODate } from './paydays';

/** Occurrence dates for `dueDay` items; weekly and biweekly stride from `anchorISO` instead. */
const MONTH_STRIDE: Partial<Record<RecurrenceFrequency, number>> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

const DAY_STRIDE: Partial<Record<RecurrenceFrequency, number>> = {
  weekly: 7,
  biweekly: 14,
};

/** Average occurrences per month, used to size steady-state funding. */
const MONTHLY_FACTOR: Record<RecurrenceFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annually',
};

/** True when the frequency repeats on a fixed day stride rather than a calendar day. */
export function isDayStrided(frequency: RecurrenceFrequency): boolean {
  return frequency === 'weekly' || frequency === 'biweekly';
}

/** Parses a yyyy-mm-dd string as a local-midnight date; null when malformed. */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (typeof iso !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The date projections start from: the saved custom date, else today at local midnight. */
export function resolveProjectionStart(projectionStartISO: string | null): Date {
  const custom = parseISODate(projectionStartISO);
  if (custom) return custom;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole days from `from` to `to`, immune to DST shifts. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** Inclusive on both ends; a null bound is unbounded. */
function withinWindow(item: Recurrence, iso: string): boolean {
  if (item.startISO && iso < item.startISO) return false;
  if (item.endISO && iso > item.endISO) return false;
  return true;
}

/** True when a bill or debt is charged on this date, ignoring overrides. */
export function occursOn(item: Recurrence & { dueDay: number }, date: Date): boolean {
  if (!withinWindow(item, toISODate(date))) return false;

  const dayStride = DAY_STRIDE[item.frequency];
  if (dayStride !== undefined) {
    const anchor = parseISODate(item.anchorISO);
    if (!anchor) return false;
    const elapsed = daysBetween(anchor, date);
    return elapsed >= 0 && elapsed % dayStride === 0;
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  if (resolveDueDay(year, month, item.dueDay) !== date.getDate()) return false;
  if (item.frequency === 'monthly') return true;

  const anchor = parseISODate(item.anchorISO);
  if (!anchor) return false;
  const monthsElapsed = (year - anchor.getFullYear()) * 12 + (month - anchor.getMonth());
  const stride = MONTH_STRIDE[item.frequency] ?? 1;
  return monthsElapsed >= 0 && monthsElapsed % stride === 0;
}

/** Every date in the given month the item is charged on. */
export function occurrencesInMonth(
  item: Recurrence & { dueDay: number },
  year: number,
  month: number,
): Date[] {
  const dates: Date[] = [];
  const total = daysInMonth(year, month);
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, month, day);
    if (occursOn(item, date)) dates.push(date);
  }
  return dates;
}

/**
 * The override in effect for an item on a date. Ranges may overlap; the last
 * one in the list wins so later edits layer cleanly over earlier ones.
 */
export function activeOverride(
  overrides: ScheduleOverride[],
  targetKind: 'bill' | 'debt',
  targetId: string,
  iso: string,
): ScheduleOverride | null {
  let match: ScheduleOverride | null = null;
  for (const override of overrides) {
    if (override.targetKind !== targetKind || override.targetId !== targetId) continue;
    if (iso < override.fromISO || iso > override.toISO) continue;
    match = override;
  }
  return match;
}

/** Overrides touching an item anywhere inside an inclusive date range. */
export function overridesInRange(
  overrides: ScheduleOverride[],
  targetKind: 'bill' | 'debt',
  targetId: string,
  fromISO: string,
  toISO: string,
): ScheduleOverride[] {
  return overrides.filter(
    (o) =>
      o.targetKind === targetKind &&
      o.targetId === targetId &&
      o.fromISO <= toISO &&
      o.toISO >= fromISO,
  );
}

function applyOverride(
  baseCents: number,
  overrides: ScheduleOverride[],
  targetKind: 'bill' | 'debt',
  targetId: string,
  date: Date,
): number | null {
  const override = activeOverride(overrides, targetKind, targetId, toISODate(date));
  if (!override) return baseCents;
  if (override.mode === 'skip') return null;
  return override.amountCents ?? baseCents;
}

/** Cents a bill charges on this date, or null when it does not occur or is skipped. */
export function billAmountOn(
  bill: Bill,
  date: Date,
  overrides: ScheduleOverride[],
): number | null {
  if (!occursOn(bill, date)) return null;
  return applyOverride(bill.amountCents, overrides, 'bill', bill.id, date);
}

/** Cents a debt payment charges on this date, or null when it does not occur or is skipped. */
export function debtAmountOn(
  debt: DebtAccount,
  date: Date,
  overrides: ScheduleOverride[],
  strategy: DebtPaymentStrategy = 'suggested',
): number | null {
  if (!occursOn(debt, date)) return null;
  return applyOverride(plannedDebtPaymentCents(debt, strategy), overrides, 'debt', debt.id, date);
}

/**
 * Steady-state cost per month, normalizing non-monthly frequencies. Temporary
 * overrides are deliberately ignored — recurring deposits are sized for the
 * long run, not for a month the bill happens to be paused.
 */
export function monthlyEquivalentCents(item: Recurrence, amountCents: number): number {
  return Math.round(amountCents * MONTHLY_FACTOR[item.frequency]);
}
