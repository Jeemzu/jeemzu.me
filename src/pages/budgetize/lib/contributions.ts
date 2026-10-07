import type { AccountSource, MonthRef, PersonIncome } from '../types';
import { getPaydays } from './paydays';

/** Split a total into per-person amounts proportional to weights, summing exactly. */
export function splitProportionally(totalCents: number, weights: number[]): number[] {
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

export function monthlyLock(person: PersonIncome, account: AccountSource): number | null {
  return (account === 'autopay'
    ? person.autopayLockedMonthlyCents
    : person.essentialsLockedMonthlyCents) ?? null;
}

/** Spread whole cents across calendar Wednesdays, including those before a partial plan start. */
export function lockedDeposit(monthlyCents: number, ref: MonthRef, day?: number): number {
  const paydays = getPaydays(ref.year, ref.month);
  if (day === undefined) return Math.ceil(monthlyCents / paydays.length);
  const index = paydays.indexOf(day);
  if (index === -1) return 0;
  return Math.floor(monthlyCents / paydays.length) + Number(index < monthlyCents % paydays.length);
}

export function unlockedShares(
  cents: number,
  weights: number[],
  eligible: boolean[],
  locks: (number | null)[],
): number[] {
  const indices = weights.flatMap((_, i) => eligible[i] && locks[i] === null ? [i] : []);
  const shares = splitProportionally(Math.max(0, cents), indices.map((i) => weights[i]));
  const result = weights.map(() => 0);
  indices.forEach((i, n) => { result[i] = shares[n]; });
  return result;
}
