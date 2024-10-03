import './code-block-element.css';
import { forwardRef } from 'react';
import { TCodeBlockElement, useCodeBlockElementState } from '@udecode/plate-code-block';
import { PlateElement, PlateElementProps, Value } from '@udecode/plate-common';

import { cn } from '../../lib/utils';

const CodeBlockElement = forwardRef<HTMLDivElement, PlateElementProps<Value, TCodeBlockElement>>(
  ({ className, ...props }, ref) => {
    const { children, element } = props;

    const state = useCodeBlockElementState({ element });

    return (
      <PlateElement ref={ref} className={cn('relative', state.className, className)} {...props}>
        <pre className="overflow-x-auto rounded-md bg-slate-100 px-4 py-4 font-mono text-sm leading-[normal] [tab-size:2] dark:bg-slate-700">
          <code>{children}</code>
        </pre>
      </PlateElement>
    );
  }
);
CodeBlockElement.displayName = 'CodeBlockElement';

export { CodeBlockElement };
