import type { MonthRef } from '../types';

/** JS weekday index for Wednesday. */
export const PAYDAY_WEEKDAY = 3;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Clamp due days 29-31 to the last day of shorter months. */
export function resolveDueDay(year: number, month: number, dueDay: number): number {
  return Math.min(dueDay, daysInMonth(year, month));
}

/** Day numbers (1-based) of every Wednesday in the month. Always 4 or 5. */
export function getPaydays(year: number, month: number): number[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const offset = (PAYDAY_WEEKDAY - firstWeekday + 7) % 7;
  const total = daysInMonth(year, month);
  const days: number[] = [];
  for (let day = 1 + offset; day <= total; day += 7) days.push(day);
  return days;
}

export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const d = new Date(ref.year, ref.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

export function monthLabel(ref: MonthRef): string {
  return monthFmt.format(new Date(ref.year, ref.month, 1));
}

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export function formatMonthDay(ref: MonthRef, day: number): string {
  return dayFmt.format(new Date(ref.year, ref.month, day));
}
