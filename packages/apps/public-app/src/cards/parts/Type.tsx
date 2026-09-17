import type { ReactNode } from 'react';
import type { LayoutProps } from '../CardDesign';

export const CardName = ({
  design,
  data,
  className,
  inline,
}: LayoutProps & { className?: string; inline?: boolean }) => {
  const first = data.firstName || data.displayName || data.odinId;
  const last = data.firstName ? data.surName : undefined;
  const { displayCase } = design.type;
  return (
    <h1
      className={`font-[family-name:var(--card-display)] ${displayCase === 'upper' ? 'uppercase' : ''} ${
        className ?? ''
      }`}
    >
      <span className={inline ? '' : 'block'}>{first}</span>
      {last ? (
        <>
          {inline ? ' ' : null}
          <span className={`${inline ? '' : 'block'} ${displayCase === 'italic-2nd-line' ? 'italic' : ''}`}>
            {last}
          </span>
        </>
      ) : null}
    </h1>
  );
};

export const CardLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p
    className={`font-[family-name:var(--card-label)] text-[11px] uppercase tracking-[0.2em] text-[color:var(--card-muted)] ${
      className ?? ''
    }`}
  >
    {children}
  </p>
);
