import { PlateElement, PlateElementProps } from '@udecode/plate-common';

import { cn } from '../../lib/utils';
import React from 'react';

const BlockquoteElement = React.forwardRef<
  React.ElementRef<typeof PlateElement>,
  PlateElementProps
>(({ className, children, ...props }, ref) => {
  return (
    <PlateElement
      asChild
      ref={ref}
      className={cn('my-1 border-l-4 pl-2 italic', className)}
      {...props}
    >
      <blockquote>{children}</blockquote>
    </PlateElement>
  );
});
BlockquoteElement.displayName = 'BlockquoteElement';

export { BlockquoteElement };
