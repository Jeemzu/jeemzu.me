import type { BudgetData, DebtPaymentStrategy, OneOffAccount } from '../types';
import { PAYDAY_WEEKDAY, toISODate } from './paydays';
import { fundedAllocator, type DepositMode } from './funding';
import { entriesOn, type LedgerEntry } from './ledger';

export { toISODate } from './paydays';

export type ProjectionOutflow = LedgerEntry;

export interface AccountWeek {
  depositCents: number;
  outflowCents: number;
  endBalanceCents: number;
}

export interface ProjectionDay {
  dateISO: string;
  isPayday: boolean;
  incomeKnown: boolean;
  /** Parallel to Projection.people. */
  personal: AccountWeek[];
  essentials: AccountWeek;
  autopay: AccountWeek;
  outflows: ProjectionOutflow[];
  inflows: ProjectionOutflow[];
}

export interface ProjectionWeek {
  startISO: string;
  /** Inclusive last day of the week. */
  endISO: string;
  paydayCount: number;
  /** False when a payday fell in a month with no income data, so deposits are unknown rather than zero. */
  incomeKnown: boolean;
  /** Parallel to Projection.people. */
  personal: AccountWeek[];
  essentials: AccountWeek;
  autopay: AccountWeek;
  outflows: ProjectionOutflow[];
  /** One-off deposits landing this week, on top of the regular paychecks. */
  inflows: ProjectionOutflow[];
  days: ProjectionDay[];
}

export interface Projection {
  people: { id: string; name: string }[];
  weeks: ProjectionWeek[];
}

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function emptyAccount(): AccountWeek {
  return { depositCents: 0, outflowCents: 0, endBalanceCents: 0 };
}

function daysUntilNextPayday(d: Date): number {
  return ((PAYDAY_WEEKDAY - d.getDay() + 7) % 7) || 7;
}

export type ProjectionRange = '8w' | '3m' | '4m' | '5m' | '6m';

export const PROJECTION_RANGES: { value: ProjectionRange; label: string }[] = [
  { value: '8w', label: '8 weeks' },
  { value: '3m', label: '3 months' },
  { value: '4m', label: '4 months' },
  { value: '5m', label: '5 months' },
  { value: '6m', label: '6 months' },
];

export const DEFAULT_PROJECTION_RANGE: ProjectionRange = '8w';

const MIN_WEEKS = 8;
const RANGE_MONTHS: Record<ProjectionRange, number> = { '8w': 0, '3m': 3, '4m': 4, '5m': 5, '6m': 6 };

/** Fewest projection weeks whose last week reaches `start` plus the range's months (never under 8). */
export function weeksForRange(range: ProjectionRange, start: Date): number {
  const months = RANGE_MONTHS[range];
  if (months === 0) return MIN_WEEKS;
  const startDate = dateOnly(start);
  const targetMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + months + 1, 0);
  const target = new Date(
    targetMonthEnd.getFullYear(),
    targetMonthEnd.getMonth(),
    Math.min(startDate.getDate(), targetMonthEnd.getDate()),
  );
  const firstWeekEnd = addDays(startDate, daysUntilNextPayday(startDate) - 1);
  const dayMs = 24 * 60 * 60 * 1000;
  // Rounded because DST shifts make local-midnight differences off by an hour.
  const daysLeft = Math.round((target.getTime() - firstWeekEnd.getTime()) / dayMs);
  const weeks = daysLeft <= 0 ? 1 : 1 + Math.ceil(daysLeft / 7);
  return Math.max(MIN_WEEKS, weeks);
}

/**
 * Weekly balance forecast anchored on Wednesday paydays. Week 1 runs from `start`
 * to the day before the next Wednesday, so money already reflected in current
 * balances is never double-counted; it only contains a payday when `start` is one.
 * Each payday is split into auto-pay, essentials, and personal deposits by the
 * funding plan in the chosen mode; paydays in months with no income data deposit nothing and
 * mark the week `incomeKnown: false`. Bills and debts draft from the account
 * named by `paidFrom`, at the amount left after any schedule override for that date.
 */
export function computeProjection(
  data: BudgetData,
  start: Date,
  weekCount = 8,
  strategy: DebtPaymentStrategy = 'suggested',
  mode: DepositMode = 'minimum',
): Projection {
  const startDate = dateOnly(start);
  const daysUntilNextWednesday = daysUntilNextPayday(startDate);

  const balances = data.people.map((p) => p.personalBalanceCents);
  let essentialsBalance = data.essentialsBalanceCents;
  let autopayBalance = data.autopayBalanceCents;
  const allocationFor = fundedAllocator(data, startDate, mode, strategy);
  const personIndex = new Map(data.people.map((p, i) => [p.id, i]));

  const weeks: ProjectionWeek[] = [];
  let weekStart = startDate;
  for (let w = 0; w < weekCount; w++) {
    const weekEnd = w === 0 ? addDays(startDate, daysUntilNextWednesday - 1) : addDays(weekStart, 6);
    const days: ProjectionDay[] = [];
    let paydayCount = 0;
    let incomeKnown = true;

    for (let d = weekStart; d <= weekEnd; d = addDays(d, 1)) {
      const personal = data.people.map(emptyAccount);
      const essentials = emptyAccount();
      const autopay = emptyAccount();
      const outflows: ProjectionOutflow[] = [];
      const inflows: ProjectionOutflow[] = [];
      const isPayday = d.getDay() === PAYDAY_WEEKDAY;
      let dayIncomeKnown = true;

      const account = (source: OneOffAccount, personId: string | null): AccountWeek | null => {
        if (source === 'autopay') return autopay;
        if (source === 'shared') return essentials;
        const i = personId === null ? -1 : personIndex.get(personId) ?? -1;
        return i >= 0 ? personal[i] : null;
      };

      if (isPayday) {
        paydayCount++;
        const allocation = allocationFor({ year: d.getFullYear(), month: d.getMonth() });
        if (!allocation.hasIncome) dayIncomeKnown = false;
        allocation.people.forEach((share, i) => {
          personal[i].depositCents += share.personalPerPaycheckCents;
          autopay.depositCents += share.autopayPerPaycheckCents;
          essentials.depositCents += share.essentialsPerPaycheckCents;
        });
      }
      const day = entriesOn(data, d, strategy);
      for (const entry of day.outflows) {
        const target = account(entry.source, entry.personId);
        if (!target) continue;
        target.outflowCents += entry.amountCents;
        outflows.push(entry);
      }
      for (const entry of day.inflows) {
        const target = account(entry.source, entry.personId);
        if (!target) continue;
        target.depositCents += entry.amountCents;
        inflows.push(entry);
      }

      data.people.forEach((_, i) => {
        balances[i] += personal[i].depositCents - personal[i].outflowCents;
        personal[i].endBalanceCents = balances[i];
      });
      essentialsBalance += essentials.depositCents - essentials.outflowCents;
      essentials.endBalanceCents = essentialsBalance;
      autopayBalance += autopay.depositCents - autopay.outflowCents;
      autopay.endBalanceCents = autopayBalance;
      if (!dayIncomeKnown) incomeKnown = false;

      days.push({
        dateISO: toISODate(d),
        isPayday,
        incomeKnown: dayIncomeKnown,
        personal,
        essentials,
        autopay,
        outflows,
        inflows,
      });
    }

    const sumAccounts = (pick: (day: ProjectionDay) => AccountWeek): AccountWeek => ({
      depositCents: days.reduce((sum, day) => sum + pick(day).depositCents, 0),
      outflowCents: days.reduce((sum, day) => sum + pick(day).outflowCents, 0),
      endBalanceCents: pick(days[days.length - 1]).endBalanceCents,
    });

    weeks.push({
      startISO: toISODate(weekStart),
      endISO: toISODate(weekEnd),
      paydayCount,
      incomeKnown,
      personal: data.people.map((_, i) => sumAccounts((day) => day.personal[i])),
      essentials: sumAccounts((day) => day.essentials),
      autopay: sumAccounts((day) => day.autopay),
      outflows: days.flatMap((day) => day.outflows),
      inflows: days.flatMap((day) => day.inflows),
      days,
    });
    weekStart = addDays(weekEnd, 1);
  }

  return { people: data.people.map((p) => ({ id: p.id, name: p.name })), weeks };
}
