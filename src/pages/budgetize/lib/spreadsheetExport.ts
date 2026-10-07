import { utils, write } from 'xlsx';
import type { AccountSource, BudgetData, OneOffAccount } from '../types';
import { monthlyGrossCents, plannedDebtPaymentCents } from '../types';
import { rankDebtPriority } from './debtPriority';
import { downloadBlob } from './download';

type Cell = string | number | boolean | null;

export interface ExportSheet {
  name: string;
  rows: Cell[][];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ACCOUNT_LABELS: Record<OneOffAccount, string> = {
  autopay: 'Auto-pay',
  shared: 'Essentials',
  personal: 'Personal',
};

const dollars = (cents: number | null): number | null => (cents === null ? null : cents / 100);
const percent = (bps: number | null): number | null => (bps === null ? null : bps / 100);
const account = (source: AccountSource | OneOffAccount): string => ACCOUNT_LABELS[source];

/** Every table in the budget as flat, header-first rows: dollars as numbers, dates as yyyy-mm-dd. */
export function buildExportSheets(data: BudgetData, asOf: Date): ExportSheet[] {
  const priorities = rankDebtPriority(data.debts, asOf);
  const personName = new Map(data.people.map((p) => [p.id, p.name]));
  const targetName = new Map<string, string>([
    ...data.bills.map((b): [string, string] => [`bill:${b.id}`, b.name]),
    ...data.debts.map((d): [string, string] => [`debt:${d.id}`, d.name]),
  ]);

  return [
    {
      name: 'Accounts',
      rows: [
        ['Setting', 'Value'],
        ['Essentials balance', dollars(data.essentialsBalanceCents)],
        ['Auto-pay balance', dollars(data.autopayBalanceCents)],
        ...data.people.map((p): Cell[] => [`${p.name} personal balance`, dollars(p.personalBalanceCents)]),
        ...data.people.flatMap((p): Cell[][] => [
          [`${p.name} locked per-paycheck auto-pay`, dollars(p.autopayLockedPerPaycheckCents ?? null)],
          [`${p.name} locked per-paycheck essentials`, dollars(p.essentialsLockedPerPaycheckCents ?? null)],
        ]),
        ['Balances as of', data.projectionStartISO ?? 'today'],
        ['Debt payment strategy', data.debtStrategy],
      ],
    },
    {
      name: 'Income',
      rows: [
        ['Person', 'Year', 'Month', 'Month name', 'Paychecks', 'Per paycheck', 'Monthly gross'],
        ...data.people.flatMap((p) =>
          [...p.schedule]
            .sort((a, b) => a.year - b.year || a.month - b.month)
            .map((entry): Cell[] => [
              p.name,
              entry.year,
              entry.month + 1,
              MONTH_NAMES[entry.month],
              entry.paycheckCount,
              dollars(entry.perPaycheckCents),
              dollars(monthlyGrossCents(entry)),
            ]),
        ),
      ],
    },
    {
      name: 'Bills',
      rows: [
        ['Name', 'Type', 'Amount', 'Due day', 'Repeats', 'First date', 'Starts', 'Ends', 'Paid from'],
        ...data.bills.map((b): Cell[] => [
          b.name,
          b.isSubscription ? 'Subscription' : 'Bill',
          dollars(b.amountCents),
          b.dueDay,
          b.frequency,
          b.anchorISO,
          b.startISO,
          b.endISO,
          account(b.paidFrom),
        ]),
      ],
    },
    {
      name: 'Debts',
      rows: [
        [
          'Priority',
          'Name',
          'Balance',
          'Min payment',
          'Suggested payment',
          'Planned payment',
          'Has promotion',
          'Promo ends',
          'Rate %',
          'Rate after promo %',
          'Effective rate %',
          'Due day',
          'Repeats',
          'First date',
          'Starts',
          'Ends',
          'Paid from',
        ],
        ...[...data.debts]
          .sort((a, b) => (priorities.get(a.id)?.rank ?? 0) - (priorities.get(b.id)?.rank ?? 0))
          .map((d): Cell[] => {
            const priority = priorities.get(d.id);
            return [
              priority?.rank ?? null,
              d.name,
              dollars(d.balanceCents),
              dollars(d.minPaymentCents),
              dollars(d.suggestedPaymentCents),
              dollars(plannedDebtPaymentCents(d, data.debtStrategy)),
              d.hasPromotion,
              d.promoEndISO,
              percent(d.interestRateBps),
              percent(d.postPromoRateBps),
              priority ? percent(priority.effectiveRateBps) : null,
              d.dueDay,
              d.frequency,
              d.anchorISO,
              d.startISO,
              d.endISO,
              account(d.paidFrom),
            ];
          }),
      ],
    },
    {
      name: 'Schedule changes',
      rows: [
        ['Applies to', 'Kind', 'From', 'To', 'Change', 'Amount', 'Note'],
        ...data.overrides.map((o): Cell[] => [
          targetName.get(`${o.targetKind}:${o.targetId}`) ?? '(removed)',
          o.targetKind,
          o.fromISO,
          o.toISO,
          o.mode === 'skip' ? 'Skip' : 'Amount',
          dollars(o.amountCents),
          o.note,
        ]),
      ],
    },
    {
      name: 'One-time',
      rows: [
        ['Date', 'Kind', 'Name', 'Amount', 'Account', 'Person', 'Note'],
        ...[...data.oneOffs]
          .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
          .map((e): Cell[] => [
            e.dateISO,
            e.kind === 'income' ? 'Income' : 'Expense',
            e.name,
            dollars(e.amountCents),
            account(e.account),
            e.personId ? (personName.get(e.personId) ?? null) : null,
            e.note,
          ]),
      ],
    },
  ];
}

export function buildExportWorkbook(data: BudgetData, asOf: Date): ArrayBuffer {
  const wb = utils.book_new();
  for (const sheet of buildExportSheets(data, asOf)) {
    utils.book_append_sheet(wb, utils.aoa_to_sheet(sheet.rows), sheet.name);
  }
  return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function downloadExportWorkbook(data: BudgetData, asOf: Date, filename: string): void {
  downloadBlob(filename, new Blob([buildExportWorkbook(data, asOf)], { type: XLSX_MIME }));
}
