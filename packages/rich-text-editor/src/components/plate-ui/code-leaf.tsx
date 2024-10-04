import { PlateLeaf, PlateLeafProps } from '@udecode/plate-common';

import { cn } from '../../lib/utils';

export function CodeLeaf({ className, children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf
      asChild
      className={cn(
        'rounded-lg bg-slate-100 px-1 py-1 font-mono text-sm text-foreground dark:bg-slate-700',
        className
      )}
      {...props}
    >
      <code>{children}</code>
    </PlateLeaf>
  );
}
