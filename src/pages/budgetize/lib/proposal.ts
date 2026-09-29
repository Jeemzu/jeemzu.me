import type { BudgetData } from '../types';
import { compareMonthlyIncome, monthlyRecurrence } from '../types';
import type { BudgetOp } from '../../../utils/budgetAgentApi';
import { getPaydays } from './paydays';

/**
 * Applies assistant-proposed ops to a copy of the budget.
 *
 * Kept pure and separate from the reducer so the preview can run the same code the
 * Apply button will: the user sees a projection of exactly the data they'd get.
 * Ops are already validated server-side against real ids; anything that still
 * doesn't match is skipped rather than silently corrupting the budget.
 */
export function applyProposal(data: BudgetData, ops: BudgetOp[]): BudgetData {
  let next: BudgetData = { ...data };

  for (const op of ops) {
    next = applyOne(next, op);
  }
  return next;
}

function applyOne(data: BudgetData, op: BudgetOp): BudgetData {
  switch (op.op) {
    case 'add_override':
      if (!op.targetKind || !op.targetId || !op.fromISO || !op.toISO || !op.mode) return data;
      return {
        ...data,
        overrides: [
          ...data.overrides,
          {
            id: crypto.randomUUID(),
            targetKind: op.targetKind,
            targetId: op.targetId,
            fromISO: op.fromISO,
            toISO: op.toISO,
            mode: op.mode,
            amountCents: op.mode === 'amount' ? op.amountCents ?? 0 : null,
            note: op.note ?? '',
          },
        ],
      };

    case 'remove_override':
      return { ...data, overrides: data.overrides.filter((o) => o.id !== op.targetId) };

    case 'add_one_off':
      if (!op.kind || !op.name || op.amountCents === undefined || !op.dateISO || !op.account) return data;
      return {
        ...data,
        oneOffs: [
          ...data.oneOffs,
          {
            id: crypto.randomUUID(),
            kind: op.kind,
            name: op.name,
            amountCents: op.amountCents,
            dateISO: op.dateISO,
            account: op.account,
            personId: op.account === 'personal' ? op.personId ?? null : null,
            note: op.note ?? '',
          },
        ],
      };

    case 'remove_one_off':
      return { ...data, oneOffs: data.oneOffs.filter((e) => e.id !== op.targetId) };

    case 'add_bill':
      if (!op.name || op.amountCents === undefined || op.dueDay === undefined) return data;
      return {
        ...data,
        bills: [
          ...data.bills,
          {
            ...monthlyRecurrence(),
            id: crypto.randomUUID(),
            name: op.name,
            amountCents: op.amountCents,
            dueDay: op.dueDay,
            paidFrom: op.paidFrom ?? 'shared',
            frequency: op.frequency ?? 'monthly',
            anchorISO: op.anchorISO ?? null,
            startISO: op.startISO ?? null,
            endISO: op.endISO ?? null,
          },
        ],
      };

    case 'update_bill':
      return {
        ...data,
        bills: data.bills.map((bill) =>
          bill.id === op.targetId
            ? {
                ...bill,
                ...definedOnly({
                  name: op.name,
                  amountCents: op.amountCents,
                  dueDay: op.dueDay,
                  paidFrom: op.paidFrom,
                  frequency: op.frequency,
                  anchorISO: op.anchorISO,
                  startISO: op.startISO,
                  endISO: op.endISO,
                }),
              }
            : bill,
        ),
      };

    case 'remove_bill':
      return {
        ...data,
        bills: data.bills.filter((b) => b.id !== op.targetId),
        overrides: data.overrides.filter(
          (o) => !(o.targetKind === 'bill' && o.targetId === op.targetId),
        ),
      };

    case 'update_debt':
      return {
        ...data,
        debts: data.debts.map((debt) =>
          debt.id === op.targetId
            ? {
                ...debt,
                // The assistant only ever proposes a debt's scheduled payment amount.
                ...definedOnly({
                  name: op.name,
                  minPaymentCents: op.amountCents,
                  dueDay: op.dueDay,
                  paidFrom: op.paidFrom,
                  frequency: op.frequency,
                  anchorISO: op.anchorISO,
                  startISO: op.startISO,
                  endISO: op.endISO,
                }),
              }
            : debt,
        ),
      };

    case 'update_person':
      return {
        ...data,
        people: data.people.map((person) =>
          person.id === op.targetId
            ? { ...person, ...definedOnly({ name: op.name }) }
            : person,
        ),
      };

    case 'set_month_income': {
      if (
        op.year === undefined ||
        op.month === undefined ||
        op.perPaycheckCents === undefined
      ) {
        return data;
      }
      const entry = {
        year: op.year,
        month: op.month,
        paycheckCount: op.paycheckCount ?? getPaydays(op.year, op.month).length,
        perPaycheckCents: op.perPaycheckCents,
      };
      return {
        ...data,
        people: data.people.map((person) =>
          person.id === op.targetId
            ? {
                ...person,
                schedule: [
                  ...person.schedule.filter(
                    (e) => !(e.year === entry.year && e.month === entry.month),
                  ),
                  entry,
                ].sort(compareMonthlyIncome),
              }
            : person,
        ),
      };
    }

    case 'set_balance': {
      if (op.amountCents === undefined) return data;
      if (op.balanceTarget === 'essentials') {
        return { ...data, essentialsBalanceCents: op.amountCents };
      }
      if (op.balanceTarget === 'autopay') {
        return { ...data, autopayBalanceCents: op.amountCents };
      }
      return {
        ...data,
        people: data.people.map((person) =>
          person.id === op.targetId
            ? { ...person, personalBalanceCents: op.amountCents as number }
            : person,
        ),
      };
    }

    default:
      return data;
  }
}

/** Drops undefined keys so a partial op patch never blanks an existing field. */
function definedOnly<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
