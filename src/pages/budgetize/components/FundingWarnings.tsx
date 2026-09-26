import type { FundingWarning } from '../lib/warnings';

interface Props {
  warnings: FundingWarning[];
}

export function FundingWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null;
  return (
    <section className="funding-warnings" aria-label="Funding warnings">
      <ul>
        {warnings.map((warning) => (
          <li key={warning.message} className={warning.severity === 'error' ? 'error' : 'warn'}>
            <span aria-hidden="true">{warning.severity === 'error' ? '⛔' : '⚠️'}</span>
            {warning.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
