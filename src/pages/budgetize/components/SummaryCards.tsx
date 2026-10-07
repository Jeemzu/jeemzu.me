import type { MonthRef } from '../types';
import type { AccountMonthTotals, MonthSummary } from '../lib/schedule';
import { formatMoney } from '../lib/money';
import { formatMonthDay } from '../lib/paydays';

interface Props {
  monthRef: MonthRef;
  summary: MonthSummary;
}

function AccountCard({ label, totals }: { label: string; totals: AccountMonthTotals }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{formatSigned(totals.netCents)}</span>
      <span className="stat-sub">
        +{formatMoney(totals.depositsCents)} in · −{formatMoney(totals.chargesCents)} out
      </span>
    </div>
  );
}

function formatSigned(cents: number): string {
  return cents > 0 ? `+${formatMoney(cents)}` : formatMoney(cents);
}

export function SummaryCards({ monthRef, summary }: Props) {
  const { autopay, essentials, personal } = summary.accounts;
  const personalClass = personal.netCents < 0 ? 'bad' : 'good';
  const paydayCount = summary.paydays.length;
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
        <span className="stat-sub">
          {formatMoney(autopay.depositsCents)} auto-pay · {formatMoney(essentials.depositsCents)}{' '}
          essentials · {formatMoney(personal.depositsCents)} personal
        </span>
      </div>
      <div className="card stat">
        <span className="stat-label">Bills + debt</span>
        <span className="stat-value">{formatMoney(summary.outflowTotalCents)}</span>
        <span className="stat-sub">
          {formatMoney(summary.billsTotalCents)} bills · {formatMoney(summary.debtsTotalCents)} debt
        </span>
      </div>
      <AccountCard label="Auto-pay account" totals={autopay} />
      <AccountCard label="Essentials account" totals={essentials} />
      <div className={`card stat ${personalClass}`}>
        <span className="stat-label">Personal left</span>
        <span className="stat-value">{formatMoney(personal.netCents)}</span>
        <span className="stat-sub">
          {paydayCount > 0
            ? `${formatMoney(Math.round(personal.netCents / paydayCount))} per payday · `
            : ''}
          after both accounts are funded
        </span>
      </div>
    </div>
  );
}
