import { describe, expect, it } from 'vitest';
import { computeFundingWarnings } from './warnings';
import { computeProjection } from './projection';
import { computeAutopayPlan } from './autopay';
import type { BudgetData, DebtPaymentStrategy } from '../types';
import { emptyBudget } from '../types';
import { bill, paidPerson } from '../testFixtures';

function budget(partial: Partial<BudgetData>): BudgetData {
  return { ...emptyBudget(), ...partial };
}

// Friday Sep 25 2026; paydays Sep 30, Oct 7, Oct 14.
const start = new Date(2026, 8, 25);

function warningsFor(data: BudgetData, strategy: DebtPaymentStrategy = 'suggested') {
  const projection = computeProjection(data, start, 4, strategy);
  const plan = computeAutopayPlan(data, start, 12, strategy);
  return computeFundingWarnings(data, projection, plan, strategy);
}

describe('computeFundingWarnings', () => {
  it('stays silent when every account is funded', () => {
    const clean = budget({
      people: [paidPerson('A', 2026, 500_00)],
      bills: [bill({ name: 'Electric', amountCents: 400_00, dueDay: 15, paidFrom: 'autopay' })],
      essentialsBalanceCents: 5000_00,
      autopayBalanceCents: 500_00,
    });
    expect(warningsFor(clean)).toEqual([]);
  });

  it('warns about months the projection covers with no pay schedule', () => {
    const nextYearOnly = budget({
      people: [paidPerson('A', 2027, 500_00)],
      essentialsBalanceCents: 5000_00,
    });
    const warnings = warningsFor(nextYearOnly);
    expect(
      warnings.some(
        (w) =>
          w.severity === 'warn' &&
          w.message.includes('No income data for') &&
          w.message.includes('September 2026'),
      ),
    ).toBe(true);
  });

  it('errors when a paycheck cannot cover its share of the bills', () => {
    const tight = budget({
      people: [paidPerson('A', 2026, 50_00)],
      bills: [bill({ name: 'Electric', amountCents: 400_00, dueDay: 15, paidFrom: 'autopay' })],
      essentialsBalanceCents: 5000_00,
      autopayBalanceCents: 500_00,
    });
    const warnings = warningsFor(tight);
    expect(
      warnings.some(
        (w) => w.severity === 'error' && w.message.includes("A's September 2026 paycheck can't cover"),
      ),
    ).toBe(true);
  });

  it('warns about projected negative weeks and lists errors first', () => {
    const broke = budget({
      people: [paidPerson('A', 2026, 50_00)],
      bills: [bill({ name: 'Rent', amountCents: 1000_00, dueDay: 1 })],
      essentialsBalanceCents: 0,
    });
    const warnings = warningsFor(broke);
    expect(
      warnings.some(
        (w) =>
          w.severity === 'warn' &&
          w.message.includes('shared essentials account') &&
          w.message.includes('2026-09-30'),
      ),
    ).toBe(true);
    expect(warnings[0].severity).toBe('error');
  });

  it('warns when the auto-pay account still needs opening funds', () => {
    const unopened = budget({
      people: [paidPerson('A', 2026, 500_00)],
      bills: [bill({ name: 'Rent', amountCents: 700_00, dueDay: 1, paidFrom: 'autopay' })],
      essentialsBalanceCents: 5000_00,
    });
    const warnings = warningsFor(unopened);
    expect(
      warnings.some(
        (w) =>
          w.severity === 'warn' &&
          w.message.includes('opening funds') &&
          w.message.includes('$700.00'),
      ),
    ).toBe(true);
    expect(
      warnings.some(
        (w) =>
          w.severity === 'warn' && w.message.includes('auto-pay account is projected to go negative'),
      ),
    ).toBe(true);
  });

  it('stays quiet about missing income when there are no people at all', () => {
    expect(warningsFor(budget({ people: [] }))).toEqual([]);
  });
});
