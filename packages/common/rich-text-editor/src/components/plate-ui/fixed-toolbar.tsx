import React from 'react';

import { cn } from '../../lib/utils';

import { Toolbar, ToolbarProps } from './toolbar';

const FixedToolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, ...props }: ToolbarProps, ref) => {
    return (
      <Toolbar
        ref={ref}
        className={cn(
          'supports-backdrop-blur:bg-background/60 sticky left-0 top-0 z-[1] w-full justify-between overflow-x-auto rounded-t-lg border-b border-b-border border-b-gray-300 bg-background/95 backdrop-blur dark:border-b-gray-700',
          className
        )}
        {...props}
      />
    );
  }
);
FixedToolbar.displayName = 'FixedToolbar';

export { FixedToolbar };
