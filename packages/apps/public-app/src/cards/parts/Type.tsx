import { Fragment, type ReactNode } from 'react';
import type { LayoutProps } from '../CardDesign';

// Without a name the card falls back to the hostname; let it wrap after a dot, not mid-word
const breakAtDots = (text: string) =>
  text.split('.').map((part, i, parts) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 ? (
        <>
          .<wbr />
        </>
      ) : null}
    </Fragment>
  ));

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
      <span className={inline ? '' : 'block'}>{breakAtDots(first)}</span>
      {last ? (
        <>
          {inline ? ' ' : null}
          <span
            className={`${inline ? '' : 'block'} ${displayCase === 'italic-2nd-line' ? 'italic' : ''}`}
          >
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
