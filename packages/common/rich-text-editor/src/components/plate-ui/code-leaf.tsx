import { cn, withRef } from '@udecode/cn';
import { PlateLeaf } from '@udecode/plate-common/react';

export const CodeLeaf = withRef<typeof PlateLeaf>(({ children, className, ...props }, ref) => {
  return (
    <PlateLeaf
      ref={ref}
      asChild
      className={cn(
        'rounded-md border bg-slate-100 px-1 py-1 font-mono text-sm text-red-500  dark:bg-slate-800 dark:text-orange-400',
        className
      )}
      {...props}
    >
      <code>{children}</code>
    </PlateLeaf>
  );
});