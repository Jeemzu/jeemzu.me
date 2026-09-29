import { describe, expect, it } from 'vitest';
import { applyProposal } from './proposal';
import { computeMonthSummary } from './schedule';
import type { BudgetOp } from '../../../utils/budgetAgentApi';
import type { BudgetData } from '../types';
import { emptyBudget, monthlyRecurrence } from '../types';

function budget(): BudgetData {
  return {
    ...emptyBudget(),
    people: [
      {
        id: 'p1',
        name: 'James',
        personalPerPaycheckCents: 100_00,
        essentialsPerPaycheckCents: 400_00,
        personalBalanceCents: 50_00,
      },
    ],
    bills: [
      {
        ...monthlyRecurrence(),
        id: 'rent',
        name: 'Rent',
        amountCents: 2000_00,
        dueDay: 1,
        category: 'Housing',
        paidFrom: 'shared',
      },
    ],
    essentialsBalanceCents: 5000_00,
  };
}

const skipRent: BudgetOp = {
  op: 'add_override',
  rationale: 'Rent is already covered through November.',
  targetKind: 'bill',
  targetId: 'rent',
  fromISO: '2026-10-01',
  toISO: '2026-11-30',
  mode: 'skip',
};

describe('applyProposal', () => {
  it('turns a skip override into a real override that pauses the bill', () => {
    const next = applyProposal(budget(), [skipRent]);

    expect(next.overrides).toHaveLength(1);
    expect(next.overrides[0]).toMatchObject({ targetId: 'rent', mode: 'skip', amountCents: null });
    expect(computeMonthSummary(next, 2026, 9).billsTotalCents).toBe(0);
    expect(computeMonthSummary(next, 2026, 11).billsTotalCents).toBe(2000_00);
  });

  it('never mutates the budget it was given', () => {
    const original = budget();
    applyProposal(original, [skipRent]);
    expect(original.overrides).toHaveLength(0);
  });

  it('applies several ops in order', () => {
    const next = applyProposal(budget(), [
      skipRent,
      {
        op: 'add_one_off',
        rationale: 'Bonus lands mid-month.',
        kind: 'income',
        name: 'Bonus',
        amountCents: 500_00,
        dateISO: '2026-10-15',
        account: 'shared',
      },
    ]);

    expect(next.overrides).toHaveLength(1);
    expect(next.oneOffs).toHaveLength(1);
    expect(computeMonthSummary(next, 2026, 9).oneOffIncomeCents).toBe(500_00);
  });

  it('keeps fields the op did not mention', () => {
    const next = applyProposal(budget(), [
      { op: 'update_bill', rationale: 'Rent went up.', targetId: 'rent', amountCents: 2100_00 },
    ]);

    expect(next.bills[0].amountCents).toBe(2100_00);
    expect(next.bills[0].category).toBe('Housing');
    expect(next.bills[0].dueDay).toBe(1);
  });

  it('drops overrides belonging to a bill it deletes', () => {
    const withOverride = applyProposal(budget(), [skipRent]);
    const next = applyProposal(withOverride, [
      { op: 'remove_bill', rationale: 'Moved out.', targetId: 'rent' },
    ]);

    expect(next.bills).toHaveLength(0);
    expect(next.overrides).toHaveLength(0);
  });

  it('ignores an op missing the fields it needs', () => {
    const next = applyProposal(budget(), [
      { op: 'add_override', rationale: 'incomplete', targetKind: 'bill', targetId: 'rent' },
    ]);
    expect(next.overrides).toHaveLength(0);
  });

  it('sets account balances by target', () => {
    const next = applyProposal(budget(), [
      { op: 'set_balance', rationale: 'Corrected.', balanceTarget: 'essentials', amountCents: 123_45 },
      { op: 'set_balance', rationale: 'Corrected.', balanceTarget: 'personal', targetId: 'p1', amountCents: 10_00 },
    ]);

    expect(next.essentialsBalanceCents).toBe(123_45);
    expect(next.people[0].personalBalanceCents).toBe(10_00);
  });
});
