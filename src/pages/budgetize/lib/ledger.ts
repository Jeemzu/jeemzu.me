import type { BudgetData, DebtPaymentStrategy, OneOffAccount } from '../types';
import { toISODate } from './paydays';
import { billAmountOn, debtAmountOn } from './recurrence';

export interface LedgerEntry {
  kind: 'bill' | 'debt' | 'one-off';
  name: string;
  amountCents: number;
  dateISO: string;
  /** Account the money moves through. */
  source: OneOffAccount;
  /** Set only when `source` is 'personal'. */
  personId: string | null;
}

/** Every charge and one-off deposit landing on a date, after schedule overrides. */
export function entriesOn(
  data: BudgetData,
  date: Date,
  strategy: DebtPaymentStrategy,
): { outflows: LedgerEntry[]; inflows: LedgerEntry[] } {
  const dateISO = toISODate(date);
  const outflows: LedgerEntry[] = [];
  const inflows: LedgerEntry[] = [];
  for (const bill of data.bills) {
    const amountCents = billAmountOn(bill, date, data.overrides);
    if (amountCents === null) continue;
    outflows.push({ kind: 'bill', name: bill.name, amountCents, dateISO, source: bill.paidFrom, personId: null });
  }
  for (const debt of data.debts) {
    const amountCents = debtAmountOn(debt, date, data.overrides, strategy);
    if (amountCents === null) continue;
    outflows.push({ kind: 'debt', name: debt.name, amountCents, dateISO, source: debt.paidFrom, personId: null });
  }
  for (const event of data.oneOffs) {
    if (event.dateISO !== dateISO) continue;
    const entry: LedgerEntry = {
      kind: 'one-off',
      name: event.name,
      amountCents: event.amountCents,
      dateISO,
      source: event.account,
      personId: event.personId,
    };
    (event.kind === 'income' ? inflows : outflows).push(entry);
  }
  return { outflows, inflows };
}
