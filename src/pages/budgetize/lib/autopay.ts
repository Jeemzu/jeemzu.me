import type { BudgetData, DebtPaymentStrategy } from '../types';
import { plannedDebtPaymentCents } from '../types';
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

/** Split a total into per-person amounts proportional to weights, summing exactly. */
function splitProportionally(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const effective = weightSum > 0 ? weights : weights.map(() => 1);
  const effectiveSum = weightSum > 0 ? weightSum : weights.length;
  if (effectiveSum === 0) return [];
  const shares: number[] = [];
  let cumulative = 0;
  let assigned = 0;
  for (const weight of effective) {
    cumulative += weight;
    const target = Math.round((totalCents * cumulative) / effectiveSum);
    shares.push(target - assigned);
    assigned = target;
  }
  return shares;
}

function autopayBills(data: BudgetData) {
  return data.bills.filter((bill) => bill.paidFrom === 'autopay');
}

function autopayDebts(data: BudgetData) {
  return data.debts.filter((debt) => debt.paidFrom === 'autopay');
}

/** Gross pay per paycheck — every deposit is carved out of it. */
function grossWeights(data: BudgetData): number[] {
  return data.people.map((p) => p.personalPerPaycheckCents + p.essentialsPerPaycheckCents);
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

function perPaydayTotalCents(data: BudgetData, strategy: DebtPaymentStrategy): number {
  const { billsMonthlyCents, debtMonthlyCents } = autopayMonthlyCents(data, strategy);
  return Math.ceil((billsMonthlyCents + debtMonthlyCents) / 4);
}

/**
 * Each person's Wednesday deposit into the auto-pay account, proportional to
 * gross pay and carved out of their essentials contribution. Parallel to
 * `data.people`; sums exactly to the per-payday total.
 */
export function autopayPaydaySharesCents(
  data: BudgetData,
  strategy: DebtPaymentStrategy = 'suggested',
): number[] {
  return splitProportionally(perPaydayTotalCents(data, strategy), grossWeights(data));
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

  const weights = grossWeights(data);
  const monthlyShares = splitProportionally(totalMonthlyCents, weights);
  const paydayShares = splitProportionally(perPaydayCents, weights);
  const shares: AutopayShare[] = data.people.map((person, i) => ({
    personId: person.id,
    name: person.name,
    monthlyCents: monthlyShares[i] ?? 0,
    perPaydayCents: paydayShares[i] ?? 0,
  }));

  const simStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);
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
