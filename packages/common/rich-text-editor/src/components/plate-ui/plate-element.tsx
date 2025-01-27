import React from 'react';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement as PlateElementPrimitive } from '@udecode/plate/react';
import { BlockSelection } from './block-selection';
import { cn } from '@udecode/cn';

export const PlateElement = React.forwardRef<
  HTMLDivElement,
  PlateElementProps & { blockSelectionClassName?: string }
>(({ blockSelectionClassName, children, className, ...props }, ref) => {
  return (
    <PlateElementPrimitive ref={ref} className={cn('relative', className)} {...props}>
      {children}

      {className?.includes('slate-selectable') && (
        <BlockSelection className={blockSelectionClassName} />
      )}
    </PlateElementPrimitive>
  );
});

PlateElement.displayName = 'PlateElement';
