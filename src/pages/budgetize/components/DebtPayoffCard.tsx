import { useMemo } from 'react';
import type { BudgetData, DebtPaymentStrategy } from '../types';
import type { DepositMode, FundingPlan } from '../lib/funding';
import { computeDebtPayoffRecommendation } from '../lib/debtRecommendation';
import { formatMoney } from '../lib/money';
import { InfoTip } from './InfoTip';

interface Props {
  data: BudgetData;
  start: Date;
  plan: FundingPlan;
  mode: DepositMode;
  strategy: DebtPaymentStrategy;
}

export function DebtPayoffCard({ data, start, plan, mode, strategy }: Props) {
  const recommendation = useMemo(
    () => computeDebtPayoffRecommendation(data, start, plan, mode, strategy),
    [data, start, plan, mode, strategy],
  );

  return (
    <section className="card debt-recommendation" aria-live="polite">
      <h3>
        Extra debt payment
        <InfoTip>
          Uses the lowest full-month projected personal remainder from people with no locked
          contribution to either shared or auto-pay. Personal one-off expenses reduce that amount.
          Extra payments go to the highest effective APR first; Budgetize does not project interest.
        </InfoTip>
      </h3>

      {recommendation.status === 'no-income-forecast' && (
        <p className="muted">Add future paycheck schedules to estimate a monthly extra payment.</p>
      )}
      {recommendation.status === 'no-surplus' && (
        <p className="muted">No unlocked personal remainder is available in the forecast.</p>
      )}
      {recommendation.status === 'missing-rates' && (
        <p>
          Up to <strong>{formatMoney(recommendation.monthlyAvailableCents)}</strong> per month is
          available. Enter an interest rate for each outstanding debt to rank the best target.
        </p>
      )}
      {recommendation.status === 'no-balance-after-plan' && (
        <p className="muted">Scheduled payments already cover the outstanding balances.</p>
      )}
      {recommendation.status === 'ready' && (
        <>
          <p>
            Up to <strong>{formatMoney(recommendation.monthlyAvailableCents)}</strong> per month is
            available for extra payments. Pay the highest-rate debt first:
          </p>
          <ol className="debt-recommendation-list">
            {recommendation.allocations.map((allocation) => (
              <li key={allocation.debtId}>
                <strong>{allocation.debtName}</strong>
                <span>
                  {formatMoney(allocation.monthlyExtraCents)} / month extra ·{' '}
                  {(allocation.effectiveRateBps / 100).toFixed(2)}% APR
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
