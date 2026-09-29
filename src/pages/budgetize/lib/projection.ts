import type { BudgetData, DebtPaymentStrategy, OneOffAccount } from '../types';
import { PAYDAY_WEEKDAY, toISODate } from './paydays';
import { autopayPaydaySharesCents } from './autopay';
import { billAmountOn, debtAmountOn } from './recurrence';

export { toISODate } from './paydays';

export interface ProjectionOutflow {
  kind: 'bill' | 'debt' | 'one-off';
  name: string;
  amountCents: number;
  dateISO: string;
  /** Account the money moves through. */
  source: OneOffAccount;
  /** Set only when `source` is 'personal'. */
  personId: string | null;
}

export interface AccountWeek {
  depositCents: number;
  outflowCents: number;
  endBalanceCents: number;
}

export interface ProjectionWeek {
  startISO: string;
  /** Inclusive last day of the week. */
  endISO: string;
  paydayCount: number;
  /** Parallel to Projection.people. */
  personal: AccountWeek[];
  essentials: AccountWeek;
  autopay: AccountWeek;
  outflows: ProjectionOutflow[];
  /** One-off deposits landing this week, on top of the regular paychecks. */
  inflows: ProjectionOutflow[];
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

/**
 * Weekly balance forecast anchored on Wednesday paydays. Week 1 runs from `start`
 * to the day before the next Wednesday, so money already reflected in current
 * balances is never double-counted; it only contains a payday when `start` is one.
 * Each payday, every person's auto-pay share is carved out of their essentials
 * deposit; bills and debts draft from the account named by `paidFrom`, at the
 * amount left after any schedule override for that date.
 */
export function computeProjection(
  data: BudgetData,
  start: Date,
  weekCount = 8,
  strategy: DebtPaymentStrategy = 'suggested',
): Projection {
  const startDate = dateOnly(start);
  const daysUntilNextWednesday = ((PAYDAY_WEEKDAY - startDate.getDay() + 7) % 7) || 7;

  const balances = data.people.map((p) => p.personalBalanceCents);
  let essentialsBalance = data.essentialsBalanceCents;
  let autopayBalance = data.autopayBalanceCents;
  const autopayShares = autopayPaydaySharesCents(data, strategy);
  const personIndex = new Map(data.people.map((p, i) => [p.id, i]));

  const weeks: ProjectionWeek[] = [];
  let weekStart = startDate;
  for (let w = 0; w < weekCount; w++) {
    const weekEnd = w === 0 ? addDays(startDate, daysUntilNextWednesday - 1) : addDays(weekStart, 6);
    const personal: AccountWeek[] = data.people.map(() => ({
      depositCents: 0,
      outflowCents: 0,
      endBalanceCents: 0,
    }));
    const essentials: AccountWeek = { depositCents: 0, outflowCents: 0, endBalanceCents: 0 };
    const autopay: AccountWeek = { depositCents: 0, outflowCents: 0, endBalanceCents: 0 };
    const outflows: ProjectionOutflow[] = [];
    const inflows: ProjectionOutflow[] = [];
    let paydayCount = 0;

    const account = (source: OneOffAccount, personId: string | null): AccountWeek | null => {
      if (source === 'autopay') return autopay;
      if (source === 'shared') return essentials;
      const i = personId === null ? -1 : personIndex.get(personId) ?? -1;
      return i >= 0 ? personal[i] : null;
    };

    for (let d = weekStart; d <= weekEnd; d = addDays(d, 1)) {
      if (d.getDay() === PAYDAY_WEEKDAY) {
        paydayCount++;
        data.people.forEach((person, i) => {
          const share = autopayShares[i] ?? 0;
          personal[i].depositCents += person.personalPerPaycheckCents;
          autopay.depositCents += share;
          essentials.depositCents += person.essentialsPerPaycheckCents - share;
        });
      }
      const dateISO = toISODate(d);
      for (const bill of data.bills) {
        const amountCents = billAmountOn(bill, d, data.overrides);
        if (amountCents === null) continue;
        const target = bill.paidFrom === 'autopay' ? autopay : essentials;
        target.outflowCents += amountCents;
        outflows.push({ kind: 'bill', name: bill.name, amountCents, dateISO, source: bill.paidFrom, personId: null });
      }
      for (const debt of data.debts) {
        const amountCents = debtAmountOn(debt, d, data.overrides, strategy);
        if (amountCents === null) continue;
        const target = debt.paidFrom === 'autopay' ? autopay : essentials;
        target.outflowCents += amountCents;
        outflows.push({ kind: 'debt', name: debt.name, amountCents, dateISO, source: debt.paidFrom, personId: null });
      }
      for (const event of data.oneOffs) {
        if (event.dateISO !== dateISO) continue;
        const target = account(event.account, event.personId);
        if (!target) continue;
        const entry: ProjectionOutflow = {
          kind: 'one-off',
          name: event.name,
          amountCents: event.amountCents,
          dateISO,
          source: event.account,
          personId: event.personId,
        };
        if (event.kind === 'income') {
          target.depositCents += event.amountCents;
          inflows.push(entry);
        } else {
          target.outflowCents += event.amountCents;
          outflows.push(entry);
        }
      }
    }

    data.people.forEach((_, i) => {
      balances[i] += personal[i].depositCents - personal[i].outflowCents;
      personal[i].endBalanceCents = balances[i];
    });
    essentialsBalance += essentials.depositCents - essentials.outflowCents;
    essentials.endBalanceCents = essentialsBalance;
    autopayBalance += autopay.depositCents - autopay.outflowCents;
    autopay.endBalanceCents = autopayBalance;

    weeks.push({
      startISO: toISODate(weekStart),
      endISO: toISODate(weekEnd),
      paydayCount,
      personal,
      essentials,
      autopay,
      outflows,
      inflows,
    });
    weekStart = addDays(weekEnd, 1);
  }

  return { people: data.people.map((p) => ({ id: p.id, name: p.name })), weeks };
}
