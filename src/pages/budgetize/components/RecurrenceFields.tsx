import type { Recurrence, RecurrenceFrequency } from '../types';
import { FREQUENCY_LABELS, isDayStrided } from '../lib/recurrence';

interface Props {
  item: Recurrence;
  /** Used in aria-labels so each row's controls are distinguishable. */
  label: string;
  onChange: (patch: Partial<Recurrence>) => void;
}

const FREQUENCIES: RecurrenceFrequency[] = [
  'monthly',
  'weekly',
  'biweekly',
  'quarterly',
  'annual',
];

/**
 * Frequency picker shared by the bill and debt editors.
 * An anchor date is required for anything but monthly, so picking one of those
 * reveals the field and seeds it rather than silently producing an invalid item.
 */
export function FrequencyField({ item, label, onChange }: Props) {
  const needsAnchor = item.frequency !== 'monthly';

  return (
    <>
      <select
        className="select-input"
        value={item.frequency}
        aria-label={`How often ${label} repeats`}
        onChange={(e) => {
          const frequency = e.target.value as RecurrenceFrequency;
          onChange({
            frequency,
            anchorISO:
              frequency === 'monthly'
                ? null
                : item.anchorISO ?? item.startISO ?? new Date().toISOString().slice(0, 10),
          });
        }}
      >
        {FREQUENCIES.map((f) => (
          <option key={f} value={f}>
            {FREQUENCY_LABELS[f]}
          </option>
        ))}
      </select>
      {needsAnchor && (
        <input
          type="date"
          className="text-input recurrence-anchor"
          value={item.anchorISO ?? ''}
          aria-label={
            isDayStrided(item.frequency)
              ? `Date ${label} first charges, and every cycle counts from it`
              : `Month ${label} first charges`
          }
          onChange={(e) => onChange({ anchorISO: e.target.value || null })}
        />
      )}
    </>
  );
}

export function StartDateField({ item, label, onChange }: Props) {
  return (
    <input
      type="date"
      className="text-input"
      value={item.startISO ?? ''}
      aria-label={`Date ${label} starts (optional)`}
      onChange={(e) => onChange({ startISO: e.target.value || null })}
    />
  );
}

export function EndDateField({ item, label, onChange }: Props) {
  return (
    <input
      type="date"
      className="text-input"
      value={item.endISO ?? ''}
      min={item.startISO ?? undefined}
      aria-label={`Date ${label} ends (optional)`}
      onChange={(e) => onChange({ endISO: e.target.value || null })}
    />
  );
}
