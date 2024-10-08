import { cn } from '@udecode/cn';
import { cva } from 'class-variance-authority';

export const toggleVariants = cva(
  cn(
    'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    variants: {
      variant: {
        default:
          'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-muted-foreground data-[state=on]:bg-slate-100 dark:data-[state=on]:bg-slate-700 data-[state=on]:text-black dark:data-[state=on]:text-indigo-100',
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        floating: 'rounded-full bg-primary text-primary-foreground',
      },
      size: {
        default: 'h-10 px-3',
        sm: 'h-9 px-1',
        lg: 'h-11 px-5',
        circle: 'p-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
