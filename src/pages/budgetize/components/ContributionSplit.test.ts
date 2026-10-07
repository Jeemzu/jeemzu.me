import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AccountPlanCard } from './AccountPlanCard';
import { ProjectionView } from './ProjectionView';
import { PeopleEditor } from './PeopleEditor';
import { computeFundingPlan, createFundedAllocator } from '../lib/funding';
import { emptyBudget } from '../types';
import { bill, paidPerson } from '../testFixtures';

const start = new Date(2026, 9, 1);
const data = {
  ...emptyBudget(),
  people: [
    paidPerson('Alex', 2026, 100000, {
      autopayLockedPerPaycheckCents: 5001, essentialsLockedPerPaycheckCents: 2503,
    }),
    paidPerson('Blair', 2026, 200000),
  ],
  bills: [
    bill({ name: 'Auto', amountCents: 100000, dueDay: 29, paidFrom: 'autopay' }),
    bill({ name: 'Shared', amountCents: 75000, dueDay: 29, paidFrom: 'shared' }),
  ],
};

describe('contribution split presentation', () => {
  it.each(['autopay', 'shared'] as const)('keeps the total and all flat contribution lines visible with %s locks', (account) => {
    const plan = computeFundingPlan(data, start);
    const funding = account === 'autopay' ? plan.autopay : plan.essentials;
    const html = renderToStaticMarkup(createElement(AccountPlanCard, { data, plan, account }));
    expect(html).toContain('Flat deposit every Wednesday');
    expect(html).not.toContain('Flat unlocked deposit');
    expect(html).toContain('Alex (locked)');
    expect(html).toContain('Blair');
    expect(html).toContain('/ payday');
    expect(funding.flatPerPaydayCents).toBe(funding.flatShares.reduce((sum, cents) => sum + cents, 0));
  });

  it.each(['minimum', 'flat'] as const)('shows all contributors for both accounts in %s projection mode', (mode) => {
    const html = renderToStaticMarkup(createElement(ProjectionView, {
      data, start, weekCount: 5, strategy: 'suggested', mode,
      onSetEssentialsBalance: vi.fn(), onSetAutopayBalance: vi.fn(),
    }));
    expect(html.match(/Alex \(locked\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html.match(/Blair/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('$50.01');
    expect(html).toContain('$25.03');
    expect(html).toContain('excludes one-time income');
  });

  it('labels editable held amounts explicitly as per-paycheck contributions', () => {
    const plan = computeFundingPlan(data, start);
    const html = renderToStaticMarkup(createElement(PeopleEditor, {
      data, allocationFor: createFundedAllocator(data, plan, 'minimum'),
      onAdd: vi.fn(), onUpdate: vi.fn(), onUpdateMany: vi.fn(), onRemove: vi.fn(),
    }));
    expect(html).toContain('Auto-pay per-paycheck lock');
    expect(html).toContain('Essentials per-paycheck lock');
    expect(html).toContain('Alex locked per-paycheck Auto-pay contribution');
    expect(html).toContain('value="50.01"');
    expect(html).not.toContain('monthly lock');
  });
});
