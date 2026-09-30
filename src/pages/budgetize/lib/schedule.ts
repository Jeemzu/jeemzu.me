import type { BudgetData, DebtPaymentStrategy } from '../types';
import { plannedDebtPaymentCents } from '../types';
import { getPaydays, toISODate } from './paydays';
import { createAllocator, type AllocationResolver } from './allocation';
import {
  billAmountOn,
  debtAmountOn,
  occurrencesInMonth,
} from './recurrence';

export { resolveDueDay } from './paydays';

export const BILL_CATEGORY = 'Bills';
export const DEBT_CATEGORY = 'Debt';
export const ONE_OFF_CATEGORY = 'One-time';

export interface ScheduledItem {
  kind: 'bill' | 'debt' | 'one-off';
  id: string;
  name: string;
  amountCents: number;
  /** Requested calendar day before any clamping. */
  dueDay: number;
  /** Actual day this month after clamping short months. */
  day: number;
  dateISO: string;
  moved: boolean;
  /** True when a schedule override changed this occurrence's amount. */
  adjusted: boolean;
}

export interface CategoryTotal {
  category: string;
  totalCents: number;
  /** Fraction of the monthly outflow total, 0-1. */
  share: number;
}

export interface MonthSummary {
  paydays: number[];
  /** False when nobody has income data for this month; income totals are then 0. */
  incomeKnown: boolean;
  /** Everyone's deposits into all accounts this month, including one-off income. */
  incomeCents: number;
  /** Deposits into the shared essentials account this month. */
  essentialsIncomeCents: number;
  billsTotalCents: number;
  /** Planned debt payments (promo payoff or minimum). */
  debtsTotalCents: number;
  /** One-time expenses dated inside this month. */
  oneOffExpenseCents: number;
  /** One-time deposits dated inside this month. */
  oneOffIncomeCents: number;
  outflowTotalCents: number;
  /** Deposits carved out of gross pay into the auto-pay account this month. */
  autopayFundingCents: number;
  /** Income left after every outflow — the household's personal spending money. */
  remainingCents: number;
  perPaydayCents: number;
  scheduled: ScheduledItem[];
  categories: CategoryTotal[];
}

interface Occurrence extends ScheduledItem {
  category: string;
  paidFrom: 'shared' | 'autopay' | 'personal';
}

export function computeMonthSummary(
  data: BudgetData,
  year: number,
  month: number,
  strategy: DebtPaymentStrategy = 'suggested',
  allocationFor: AllocationResolver = createAllocator(data, strategy),
): MonthSummary {
  const paydays = getPaydays(year, month);
  const allocation = allocationFor({ year, month });
  const essentialsIncomeCents = allocation.people.reduce(
    (sum, p) => sum + p.essentialsPerPaycheckCents * p.paycheckCount,
    0,
  );

  const items: Occurrence[] = [];

  for (const bill of data.bills) {
    for (const date of occurrencesInMonth(bill, year, month)) {
      const amountCents = billAmountOn(bill, date, data.overrides);
      if (amountCents === null) continue;
      const day = date.getDate();
      items.push({
        kind: 'bill',
        id: bill.id,
        name: bill.name,
        amountCents,
        dueDay: bill.dueDay,
        day,
        dateISO: toISODate(date),
        moved: day !== bill.dueDay,
        adjusted: amountCents !== bill.amountCents,
        category: BILL_CATEGORY,
        paidFrom: bill.paidFrom,
      });
    }
  }

  for (const debt of data.debts) {
    const planned = plannedDebtPaymentCents(debt, strategy);
    for (const date of occurrencesInMonth(debt, year, month)) {
      const amountCents = debtAmountOn(debt, date, data.overrides, strategy);
      if (amountCents === null) continue;
      const day = date.getDate();
      items.push({
        kind: 'debt',
        id: debt.id,
        name: debt.name,
        amountCents,
        dueDay: debt.dueDay,
        day,
        dateISO: toISODate(date),
        moved: day !== debt.dueDay,
        adjusted: amountCents !== planned,
        category: DEBT_CATEGORY,
        paidFrom: debt.paidFrom,
      });
    }
  }

  let oneOffIncomeCents = 0;
  for (const event of data.oneOffs) {
    const date = parseMonthDate(event.dateISO, year, month);
    if (date === null) continue;
    if (event.kind === 'income') {
      oneOffIncomeCents += event.amountCents;
      continue;
    }
    items.push({
      kind: 'one-off',
      id: event.id,
      name: event.name,
      amountCents: event.amountCents,
      dueDay: date,
      day: date,
      dateISO: event.dateISO,
      moved: false,
      adjusted: false,
      category: ONE_OFF_CATEGORY,
      paidFrom: event.account,
    });
  }

  const scheduled: ScheduledItem[] = items
    .map(({ kind, id, name, amountCents, dueDay, day, dateISO, moved, adjusted }) => ({
      kind,
      id,
      name,
      amountCents,
      dueDay,
      day,
      dateISO,
      moved,
      adjusted,
    }))
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));

  const totalFor = (kind: ScheduledItem['kind']) =>
    items.reduce((sum, item) => (item.kind === kind ? sum + item.amountCents : sum), 0);
  const billsTotalCents = totalFor('bill');
  const debtsTotalCents = totalFor('debt');
  const oneOffExpenseCents = totalFor('one-off');
  const outflowTotalCents = billsTotalCents + debtsTotalCents + oneOffExpenseCents;
  const incomeCents = allocation.grossMonthlyCents + oneOffIncomeCents;

  const autopayFundingCents = allocation.people.reduce(
    (sum, p) => sum + p.autopayPerPaycheckCents * p.paycheckCount,
    0,
  );
  // Essentials and auto-pay deposits are sized to the bills, so what is left over
  // is whatever gross pay and one-off income the outflows did not consume.
  const remainingCents = incomeCents - outflowTotalCents;
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
    incomeKnown: allocation.hasIncome,
    incomeCents,
    essentialsIncomeCents,
    billsTotalCents,
    debtsTotalCents,
    oneOffExpenseCents,
    oneOffIncomeCents,
    outflowTotalCents,
    autopayFundingCents,
    remainingCents,
    perPaydayCents,
    scheduled,
    categories,
  };
}

/** Day-of-month for an ISO date inside the given month, or null when it falls elsewhere. */
function parseMonthDate(iso: string, year: number, month: number): number | null {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  if (!iso.startsWith(prefix)) return null;
  const day = Number(iso.slice(prefix.length));
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}
