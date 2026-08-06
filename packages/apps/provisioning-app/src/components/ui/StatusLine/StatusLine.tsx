import { ReactNode } from 'react';

const TONES = {
  idle: { text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
  checking: { text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400 animate-pulse' },
  ok: { text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
  bad: { text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
} as const;

export type StatusTone = keyof typeof TONES;

export const StatusLine = ({
  tone,
  className = '',
  children,
}: {
  tone: StatusTone;
  className?: string;
  children: ReactNode;
}) => (
  <p
    role="status"
    aria-live="polite"
    className={`mt-2 flex flex-row items-center gap-2 text-sm ${TONES[tone].text} ${className}`}
  >
    <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${TONES[tone].dot}`} />
    {children}
  </p>
);
