import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BillsEditor } from './BillsEditor';
import { bill } from '../testFixtures';

const handlers = { onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn() };

describe('BillsEditor sections', () => {
  it('shows the subscription empty state and add action', () => {
    const html = renderToStaticMarkup(
      createElement(BillsEditor, { section: 'subscriptions', bills: [], ...handlers }),
    );
    expect(html).toContain('No subscriptions yet. Add one below.');
    expect(html).toContain('+ Add subscription');
    expect(html).not.toContain('+ Add bill');
  });

  it('renders subscription controls and monthly totals using the bill editor', () => {
    const bills = [
      bill({ name: 'Streaming', amountCents: 1500, dueDay: 15, isSubscription: true }),
    ];
    const html = renderToStaticMarkup(
      createElement(BillsEditor, { section: 'subscriptions', bills, ...handlers }),
    );
    expect(html).toContain('Subscription');
    expect(html).toContain('Amount for Streaming');
    expect(html).toContain('Due day for Streaming');
    expect(html).toContain('Account Streaming is paid from');
    expect(html).toContain('Total per month');
    expect(html).toContain('$15.00');
  });
});
