import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { toggleVariants } from './toggle/toggle-variants';

export type ToggleProps = React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>;

const Toggle = React.forwardRef<React.ElementRef<typeof TogglePrimitive.Root>, ToggleProps>(
  ({ className, variant, size, ...props }, ref) => (
    <TogglePrimitive.Root
      ref={ref}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
);

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle };