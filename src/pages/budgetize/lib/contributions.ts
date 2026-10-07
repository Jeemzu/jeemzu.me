import type { AccountSource, PersonIncome } from '../types';

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

export function paycheckLock(person: PersonIncome, account: AccountSource): number | null {
  return (account === 'autopay'
    ? person.autopayLockedPerPaycheckCents
    : person.essentialsLockedPerPaycheckCents) ?? null;
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
