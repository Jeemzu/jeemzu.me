import type { MonthRef } from '../types';
import type { MonthSummary } from '../lib/schedule';
import { formatMoney } from '../lib/money';
import { formatMonthDay } from '../lib/paydays';

interface Props {
  monthRef: MonthRef;
  summary: MonthSummary;
}

export function SummaryCards({ monthRef, summary }: Props) {
  const remainClass = summary.remainingCents < 0 ? 'bad' : 'good';
  return (
    <div className="summary-cards">
      <div className="card stat">
        <span className="stat-label">Paydays (Wednesdays)</span>
        <span className="stat-value">{summary.paydays.length}</span>
        <span className="stat-sub">{summary.paydays.map((d) => formatMonthDay(monthRef, d)).join(' · ')}</span>
      </div>
      <div className="card stat">
        <span className="stat-label">Deposits</span>
        <span className="stat-value">{formatMoney(summary.incomeCents)}</span>
        <span className="stat-sub">{formatMoney(summary.essentialsIncomeCents)} to essentials</span>
      </div>
      <div className="card stat">
        <span className="stat-label">Bills + debt</span>
        <span className="stat-value">{formatMoney(summary.outflowTotalCents)}</span>
        <span className="stat-sub">
          {formatMoney(summary.billsTotalCents)} bills · {formatMoney(summary.debtsTotalCents)} debt
        </span>
      </div>
      <div className={`card stat ${remainClass}`}>
        <span className="stat-label">Essentials left</span>
        <span className="stat-value">{formatMoney(summary.remainingCents)}</span>
        <span className="stat-sub">essentials deposits − bills & debt</span>
      </div>
      <div className={`card stat ${remainClass}`}>
        <span className="stat-label">Per payday</span>
        <span className="stat-value">{formatMoney(summary.perPaydayCents)}</span>
        <span className="stat-sub">remaining ÷ {summary.paydays.length} paydays</span>
      </div>
    </div>
  );
}
