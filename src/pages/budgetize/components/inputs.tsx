import { useEffect, useState } from 'react';
import { centsToInput, parseMoney } from '../lib/money';

interface MoneyInputProps {
  cents: number;
  onCommit: (cents: number) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
  /** Permit negative amounts (overdrafted balances). */
  allowNegative?: boolean;
}

/** Dollar text input that keeps free-form text while focused and commits cents on blur. */
export function MoneyInput({ cents, onCommit, id, ariaLabel, className, allowNegative }: MoneyInputProps) {
  const [text, setText] = useState(() => centsToInput(cents));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(centsToInput(cents));
  }, [cents, focused]);

  return (
    <div className={`money-input ${className ?? ''}`}>
      <span aria-hidden="true">$</span>
      <input
        id={id}
        aria-label={ariaLabel}
        inputMode="decimal"
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          const parsed = parseMoney(text);
          if (parsed !== null && (allowNegative || parsed >= 0)) onCommit(parsed);
          else setText(centsToInput(cents));
        }}
      />
    </div>
  );
}

interface DayInputProps {
  value: number;
  onCommit: (day: number) => void;
  ariaLabel?: string;
}

/** Due-day input constrained to whole days 1-31, committed on blur. */
export function DayInput({ value, onCommit, ariaLabel }: DayInputProps) {
  const [text, setText] = useState(() => String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <input
      className="day-input"
      aria-label={ariaLabel}
      inputMode="numeric"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const parsed = Number(text.trim());
        if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 31) onCommit(parsed);
        else setText(String(value));
      }}
    />
  );
}
