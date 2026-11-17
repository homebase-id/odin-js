import { ReactNode } from 'react';

const TONES = {
  idle: { text: 'text-muted-foreground', dot: 'bg-outline' },
  checking: { text: 'text-muted-foreground', dot: 'bg-outline animate-pulse' },
  ok: { text: 'text-success', dot: 'bg-success' },
  bad: { text: 'text-destructive', dot: 'bg-destructive' },
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
