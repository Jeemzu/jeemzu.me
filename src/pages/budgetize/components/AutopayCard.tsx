import { useMemo } from 'react';
import type { BudgetData, DebtPaymentStrategy } from '../types';
import { computeAutopayPlan } from '../lib/autopay';
import { formatMoney } from '../lib/money';

interface Props {
  data: BudgetData;
  strategy: DebtPaymentStrategy;
}

function fmtISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}

export function AutopayCard({ data, strategy }: Props) {
  const plan = useMemo(() => computeAutopayPlan(data, new Date(), 12, strategy), [data, strategy]);

  if (plan.totalMonthlyCents === 0) {
    return <p className="muted">Flag bills or debts as paid from auto-pay to size the account.</p>;
  }

  return (
    <div className="autopay">
      <div className="autopay-hero">
        <span className="stat-label">Deposit every Wednesday</span>
        <span className="stat-value">{formatMoney(plan.perPaydayCents)}</span>
      </div>
      <ul className="autopay-lines">
        <li>
          <span>Auto-pay bills</span>
          <span>{formatMoney(plan.billsMonthlyCents)} / mo</span>
        </li>
        <li>
          <span>Debt payments ({strategy === 'minimum' ? 'minimums' : 'planned'})</span>
          <span>{formatMoney(plan.debtMonthlyCents)} / mo</span>
        </li>
        <li className="autopay-total">
          <span>Total to cover</span>
          <span>{formatMoney(plan.totalMonthlyCents)} / mo</span>
        </li>
      </ul>
      {plan.shares.length > 0 && (
        <>
          <span className="field-label">Split by gross pay</span>
          <ul className="autopay-lines">
            {plan.shares.map((share) => (
              <li key={share.personId}>
                <span>{share.name}</span>
                <span>
                  {formatMoney(share.perPaydayCents)} / payday · {formatMoney(share.monthlyCents)} / mo
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="autopay-buffer">
        <span className="field-label">Opening funds still needed</span>
        <span className="autopay-buffer-amount">{formatMoney(plan.bufferCents)}</span>
        <p className="muted">
          On top of the current {formatMoney(data.autopayBalanceCents)} balance, so early-month due
          dates never overdraw the account (simulated 12 months of due dates vs. Wednesday deposits
          starting {fmtISO(plan.simStartISO)}).
        </p>
      </div>
      <p className="muted">
        Covers only items flagged “Auto-pay”, sized for 4-payday months using the active debt
        strategy — 5th Wednesdays build extra cushion.
      </p>
    </div>
  );
}
