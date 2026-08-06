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
    className={`rounded-lg border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800 ${className}`}
    aria-live={announceChanges ? 'polite' : undefined}
  >
    {title ? (
      <p className="flex flex-row items-center gap-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {title}
        <span className="h-px flex-grow bg-slate-200 dark:bg-slate-700" />
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
    className={`flex flex-row items-center gap-3 border-b border-slate-200 py-3 transition-opacity last:border-b-0 dark:border-slate-700/60 ${
      isDimmed ? 'opacity-50' : ''
    }`}
  >
    {icon}
    {children}
  </div>
);
