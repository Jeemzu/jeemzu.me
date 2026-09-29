import type { Bill, DebtAccount, MonthlyIncome, PersonIncome } from './types';
import { monthlyRecurrence } from './types';
import { getPaydays } from './lib/paydays';

/** A full calendar year of identical gross paychecks, with counts from the Wednesday calendar. */
export function yearSchedule(year: number, perPaycheckCents: number): MonthlyIncome[] {
  return Array.from({ length: 12 }, (_, month) => ({
    year,
    month,
    paycheckCount: getPaydays(year, month).length,
    perPaycheckCents,
  }));
}

export function person(
  partial: Partial<PersonIncome> & Pick<PersonIncome, 'name'>,
): PersonIncome {
  return {
    id: partial.name,
    schedule: [],
    personalBalanceCents: 0,
    ...partial,
  };
}

/** Person paid `perPaycheckCents` every payday of `year`. */
export function paidPerson(
  name: string,
  year: number,
  perPaycheckCents: number,
  partial: Partial<PersonIncome> = {},
): PersonIncome {
  return person({ name, schedule: yearSchedule(year, perPaycheckCents), ...partial });
}

export function bill(
  partial: Partial<Bill> & Pick<Bill, 'name' | 'amountCents' | 'dueDay'>,
): Bill {
  return { id: partial.name, paidFrom: 'shared', ...monthlyRecurrence(), ...partial };
}

export function debt(
  partial: Partial<DebtAccount> & Pick<DebtAccount, 'name' | 'minPaymentCents'>,
): DebtAccount {
  return {
    id: partial.name,
    balanceCents: 0,
    suggestedPaymentCents: null,
    hasPromotion: false,
    interestRateBps: null,
    promoEndISO: null,
    postPromoRateBps: null,
    dueDay: 1,
    paidFrom: 'autopay',
    ...monthlyRecurrence(),
    ...partial,
  };
}
