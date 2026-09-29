import type { BudgetData, DebtPaymentStrategy, MonthRef } from '../types';
import { plannedDebtPaymentCents } from '../types';
import { allocateMonth, splitProportionally } from './allocation';
import { PAYDAY_WEEKDAY, toISODate } from './paydays';
import { billAmountOn, debtAmountOn, monthlyEquivalentCents } from './recurrence';

export interface AutopayShare {
  personId: string;
  name: string;
  monthlyCents: number;
  perPaydayCents: number;
}

export interface AutopayPlan {
  billsMonthlyCents: number;
  debtMonthlyCents: number;
  /** Everything the auto-pay account must cover per month. */
  totalMonthlyCents: number;
  /** Deposit needed every Wednesday, sized for 4-payday months. */
  perPaydayCents: number;
  shares: AutopayShare[];
  /** Extra opening funds (beyond the current balance) that keep the simulated account from ever dipping negative. */
  bufferCents: number;
  /** First day of the simulation (1st of next month). */
  simStartISO: string;
}

function autopayBills(data: BudgetData) {
  return data.bills.filter((bill) => bill.paidFrom === 'autopay');
}

function autopayDebts(data: BudgetData) {
  return data.debts.filter((debt) => debt.paidFrom === 'autopay');
}

/** Gross pay per month, used to divide funding between people. */
function grossWeights(data: BudgetData, ref: MonthRef, strategy: DebtPaymentStrategy): number[] {
  return allocateMonth(data, ref, strategy).people.map((p) => p.grossMonthlyCents);
}

/** Steady-state monthly cost of everything drafting from the auto-pay account. */
function autopayMonthlyCents(data: BudgetData, strategy: DebtPaymentStrategy) {
  const billsMonthlyCents = autopayBills(data).reduce(
    (sum, bill) => sum + monthlyEquivalentCents(bill, bill.amountCents),
    0,
  );
  const debtMonthlyCents = autopayDebts(data).reduce(
    (sum, debt) => sum + monthlyEquivalentCents(debt, plannedDebtPaymentCents(debt, strategy)),
    0,
  );
  return { billsMonthlyCents, debtMonthlyCents };
}

/**
 * Each person's Wednesday deposit into the auto-pay account for the given
 * month, carved straight out of their gross pay. Parallel to `data.people`;
 * every amount is 0 in months with no income data.
 */
export function autopayPaydaySharesCents(
  data: BudgetData,
  ref: MonthRef,
  strategy: DebtPaymentStrategy = 'suggested',
): number[] {
  return allocateMonth(data, ref, strategy).people.map((p) => p.autopayPerPaycheckCents);
}

/**
 * Sizes the auto-pay account from the bills and debts flagged `paidFrom:
 * 'autopay'`, using the active debt strategy so funding matches what the
 * projection debits. Recurring deposits are sized from frequency-normalized
 * monthly equivalents and ignore temporary overrides, but the buffer simulation
 * walks real occurrence dates and applies overrides and one-offs; outflows apply
 * before same-day deposits to stay conservative.
 */
export function computeAutopayPlan(
  data: BudgetData,
  start: Date = new Date(),
  months = 12,
  strategy: DebtPaymentStrategy = 'suggested',
): AutopayPlan {
  const bills = autopayBills(data);
  const debts = autopayDebts(data);
  const { billsMonthlyCents, debtMonthlyCents } = autopayMonthlyCents(data, strategy);
  const totalMonthlyCents = billsMonthlyCents + debtMonthlyCents;
  const perPaydayCents = Math.ceil(totalMonthlyCents / 4);

  const simStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const simRef: MonthRef = { year: simStart.getFullYear(), month: simStart.getMonth() };
  const weights = grossWeights(data, simRef, strategy);
  const monthlyShares = splitProportionally(totalMonthlyCents, weights);
  const paydayShares = splitProportionally(perPaydayCents, weights);
  const shares: AutopayShare[] = data.people.map((person, i) => ({
    personId: person.id,
    name: person.name,
    monthlyCents: monthlyShares[i] ?? 0,
    perPaydayCents: paydayShares[i] ?? 0,
  }));

  const simEnd = new Date(simStart.getFullYear(), simStart.getMonth() + months, 1);
  let balance = data.autopayBalanceCents;
  let minBalance = Math.min(0, balance);
  for (let d = simStart; d < simEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const dateISO = toISODate(d);
    for (const bill of bills) {
      balance -= billAmountOn(bill, d, data.overrides) ?? 0;
    }
    for (const debt of debts) {
      balance -= debtAmountOn(debt, d, data.overrides, strategy) ?? 0;
    }
    for (const event of data.oneOffs) {
      if (event.account !== 'autopay' || event.dateISO !== dateISO) continue;
      balance += event.kind === 'income' ? event.amountCents : -event.amountCents;
    }
    if (balance < minBalance) minBalance = balance;
    if (d.getDay() === PAYDAY_WEEKDAY) balance += perPaydayCents;
  }

  return {
    billsMonthlyCents,
    debtMonthlyCents,
    totalMonthlyCents,
    perPaydayCents,
    shares,
    bufferCents: Math.max(0, -minBalance),
    simStartISO: toISODate(simStart),
  };
}
