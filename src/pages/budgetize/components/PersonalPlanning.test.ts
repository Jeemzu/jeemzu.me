import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { emptyBudget, type PersonalExpense } from '../types';
import { paidPerson } from '../testFixtures';
import { createAllocator } from '../lib/allocation';
import { ProjectionView } from './ProjectionView';
import { PersonalExpensesEditor } from './PersonalExpensesEditor';

const start = new Date(2026, 11, 2);
const expenses: PersonalExpense[] = [
  { id: 'trip', name: 'Trip', amountCents: 10000, dateISO: '2026-12-04', frequency: 'once', endISO: null, personId: null },
  { id: 'train', name: 'Train', amountCents: 2000, dateISO: '2026-12-04', frequency: 'monthly', endISO: null, personId: 'A' },
];
const data = {
  ...emptyBudget(), people: [paidPerson('A', 2026, 50000), paidPerson('B', 2026, 150000)],
  personalExpenses: expenses,
};
const handlers = { onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn() };

describe('personal planning tables', () => {
  it('separates the combined editor from individual plans and shows proportional shares', () => {
    const props = { expenses, people: data.people, start, allocationFor: createAllocator(data), ...handlers };
    const combined = renderToStaticMarkup(createElement(PersonalExpensesEditor, { ...props, personId: null }));
    const individual = renderToStaticMarkup(createElement(PersonalExpensesEditor, { ...props, personId: 'A' }));
    expect(combined).toContain('Amount for Trip');
    expect(combined).not.toContain('Amount for Train');
    expect(combined).toContain('$25.00');
    expect(combined).toContain('$75.00');
    expect(individual).toContain('Amount for Train');
    expect(individual).not.toContain('Amount for Trip');
    expect(individual).toContain('End date for Train');
  });

  it('flags equal splits for missing income and disables adding without people', () => {
    const unknown = { ...data, people: data.people.map((p) => ({ ...p, schedule: [] })) };
    const html = renderToStaticMarkup(createElement(PersonalExpensesEditor, {
      expenses, people: unknown.people, personId: null, start,
      allocationFor: createAllocator(unknown), ...handlers,
    }));
    expect(html).toContain('Unknown income: equal split');
    expect(html).toContain('$50.00');
    const empty = renderToStaticMarkup(createElement(PersonalExpensesEditor, {
      expenses: [], people: [], personId: null, start, allocationFor: createAllocator(emptyBudget()), ...handlers,
    }));
    expect(empty).toContain('disabled=""');
  });

  it('shows personal income, combined withdrawals and own expenses, not shared starting balances', () => {
    const html = renderToStaticMarkup(createElement(ProjectionView, {
      data, start, weekCount: 1, strategy: 'suggested', mode: 'minimum',
      personalPersonId: 'A', onSetPersonalBalance: vi.fn(),
    }));
    expect(html).toContain('Current personal balance for A');
    expect(html).not.toContain('Current personal balance for B');
    expect(html).not.toContain('Current auto-pay account balance');
    expect(html).not.toContain('Current essentials account balance');
    expect(html).toContain('Combined plan');
    expect(html).toContain('Own expenses');
    expect(html).toContain('$25.00');
    expect(html).toContain('$20.00');
    expect(html).toContain('$455.00');
  });

  it('combines balances across personal accounts and flags a partially missing pay schedule', () => {
    const partial = { ...data, people: [data.people[0], { ...data.people[1], schedule: [] }] };
    const html = renderToStaticMarkup(createElement(ProjectionView, {
      data: partial, start, weekCount: 1, strategy: 'suggested', mode: 'minimum',
      personalPersonId: null, onSetPersonalBalance: vi.fn(),
    }));
    expect(html).toContain('Current personal balance for A');
    expect(html).toContain('Current personal balance for B');
    expect(html).toContain('income-unknown');
    expect(html).toContain('$380.00');
  });

  it('keeps personal payments out of the shared-account projection', () => {
    const html = renderToStaticMarkup(createElement(ProjectionView, {
      data, start, weekCount: 1, strategy: 'suggested', mode: 'minimum',
      onSetAutopayBalance: vi.fn(), onSetEssentialsBalance: vi.fn(),
    }));
    expect(html).toContain('Current auto-pay account balance');
    expect(html).toContain('Current essentials account balance');
    expect(html).not.toContain('Current personal balance');
    expect(html).not.toContain('Trip');
    expect(html).not.toContain('Train');
  });
});
