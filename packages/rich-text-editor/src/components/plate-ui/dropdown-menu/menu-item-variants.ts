import { cn } from '@udecode/cn';
import { cva } from 'class-variance-authority';

export const menuItemVariants = cva(
  cn(
    'relative flex h-9 cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
    'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
  ),
  {
    variants: {
      inset: {
        true: 'pl-8',
      },
    },
  }
);
