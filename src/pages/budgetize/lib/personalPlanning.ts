import type { PersonalExpense } from '../types';
import type { MonthAllocation } from './allocation';
import { splitProportionally } from './contributions';
import { occursOn, parseISODate } from './recurrence';
import { toISODate } from './paydays';

export function personalExpenseOccursOn(expense: PersonalExpense, date: Date): boolean {
  const iso = toISODate(date);
  if (expense.frequency === 'once') return iso === expense.dateISO;
  const first = parseISODate(expense.dateISO);
  return first !== null && occursOn({
    frequency: expense.frequency,
    anchorISO: expense.dateISO,
    startISO: expense.dateISO,
    endISO: expense.endISO,
    dueDay: first.getDate(),
  }, date);
}

/** Missing income for anyone makes the combined split provisional and equal. */
export function personalExpenseShares(expense: PersonalExpense, allocation: MonthAllocation): {
  cents: number[];
  incomeKnown: boolean;
} {
  const incomeKnown = allocation.people.length > 0 && allocation.people.every((p) => p.hasIncome);
  if (expense.personId !== null) {
    return {
      cents: allocation.people.map((p) => p.personId === expense.personId ? expense.amountCents : 0),
      incomeKnown,
    };
  }
  const weights = allocation.people.map((p) =>
    incomeKnown ? Math.max(0, p.personalPerPaycheckCents * p.paycheckCount) : 1);
  return { cents: splitProportionally(expense.amountCents, weights), incomeKnown };
}
