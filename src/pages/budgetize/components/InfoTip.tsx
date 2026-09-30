import { useId, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

export function InfoTip({ children, label = 'More info' }: Props) {
  const id = useId();
  return (
    <span className="info-tip">
      <button type="button" className="info-tip-trigger" aria-label={label} aria-describedby={id}>
        i
      </button>
      <span role="tooltip" id={id} className="info-tip-bubble">
        {children}
      </span>
    </span>
  );
}
