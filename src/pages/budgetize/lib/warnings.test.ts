import { describe, expect, it } from 'vitest';
import { computeFundingWarnings } from './warnings';
import { computeProjection } from './projection';
import { computeAutopayPlan } from './autopay';
import type { Bill, BudgetData, DebtPaymentStrategy, PersonIncome } from '../types';

function person(
  partial: Partial<PersonIncome> & Pick<PersonIncome, 'name'>,
): PersonIncome {
  return {
    id: partial.name,
    personalPerPaycheckCents: 0,
    essentialsPerPaycheckCents: 0,
    personalBalanceCents: 0,
    ...partial,
  };
}

function bill(partial: Partial<Bill> & Pick<Bill, 'name' | 'amountCents' | 'dueDay'>): Bill {
  return { id: partial.name, category: '', paidFrom: 'shared', ...partial };
}

function budget(partial: Partial<BudgetData>): BudgetData {
  return { people: [], bills: [], debts: [], essentialsBalanceCents: 0, autopayBalanceCents: 0, ...partial };
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
      people: [person({ name: 'A', essentialsPerPaycheckCents: 500_00 })],
      bills: [bill({ name: 'Electric', amountCents: 400_00, dueDay: 15, paidFrom: 'autopay' })],
      essentialsBalanceCents: 5000_00,
      autopayBalanceCents: 500_00,
    });
    expect(warningsFor(clean)).toEqual([]);
  });

  it('errors when a share exceeds the essentials contribution', () => {
    const tight = budget({
      people: [person({ name: 'A', essentialsPerPaycheckCents: 50_00 })],
      bills: [bill({ name: 'Electric', amountCents: 400_00, dueDay: 15, paidFrom: 'autopay' })],
      essentialsBalanceCents: 5000_00,
      autopayBalanceCents: 500_00,
    });
    const warnings = warningsFor(tight);
    expect(warnings.some(
      (w) => w.severity === 'error' && w.message.includes("A's paycheck can't cover their auto-pay share"),
    )).toBe(true);
  });

  it('errors when essentials deposits cannot fund a 4-payday month', () => {
    const underfunded = budget({
      people: [person({ name: 'A', essentialsPerPaycheckCents: 500_00 })],
      bills: [bill({ name: 'Rent', amountCents: 3000_00, dueDay: 1 })],
      essentialsBalanceCents: 100000_00,
    });
    const warnings = warningsFor(underfunded);
    expect(warnings.some(
      (w) => w.severity === 'error' && w.message.includes('4-payday month'),
    )).toBe(true);
  });

  it('warns about projected negative weeks and lists errors first', () => {
    const broke = budget({
      bills: [bill({ name: 'Rent', amountCents: 1000_00, dueDay: 1 })],
      essentialsBalanceCents: 0,
    });
    const warnings = warningsFor(broke);
    expect(warnings.some(
      (w) => w.severity === 'warn' && w.message.includes('shared essentials account') && w.message.includes('2026-09-30'),
    )).toBe(true);
    expect(warnings[0].severity).toBe('error');
  });

  it('warns when the auto-pay account still needs opening funds', () => {
    const unopened = budget({
      people: [person({ name: 'A', essentialsPerPaycheckCents: 500_00 })],
      bills: [bill({ name: 'Rent', amountCents: 700_00, dueDay: 1, paidFrom: 'autopay' })],
      essentialsBalanceCents: 5000_00,
    });
    const warnings = warningsFor(unopened);
    expect(warnings.some(
      (w) => w.severity === 'warn' && w.message.includes('opening funds') && w.message.includes('$700.00'),
    )).toBe(true);
    expect(warnings.some(
      (w) => w.severity === 'warn' && w.message.includes('auto-pay account is projected to go negative'),
    )).toBe(true);
  });
});
