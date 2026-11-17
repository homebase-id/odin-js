import { ReactNode } from 'react';

interface CardProps {
  // Renders the uppercase eyebrow and hairline rule above the rows
  title?: string;
  // Announce content changes; for cards whose rows update while the user waits
  announceChanges?: boolean;
  className?: string;
  children: ReactNode;
}

export const Card = ({ title, announceChanges, className = '', children }: CardProps) => (
  <div
    className={`rounded-lg border border-outline-variant bg-background px-4 ${className}`}
    aria-live={announceChanges ? 'polite' : undefined}
  >
    {title ? (
      <p className="flex flex-row items-center gap-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
        <span className="h-px flex-grow bg-outline-variant" />
      </p>
    ) : null}
    {children}
  </div>
);

export const CardRow = ({
  icon,
  isDimmed,
  children,
}: {
  icon: ReactNode;
  isDimmed?: boolean;
  children: ReactNode;
}) => (
  <div
    className={`flex flex-row items-center gap-3 border-b border-outline-variant py-3 transition-opacity last:border-b-0 ${
      isDimmed ? 'opacity-50' : ''
    }`}
  >
    {icon}
    {children}
  </div>
);
