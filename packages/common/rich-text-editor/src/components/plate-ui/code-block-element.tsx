import './code-block-element.css';

import { cn } from '../../lib/utils';
import { useCodeBlockElementState } from '@udecode/plate-code-block/react';
import { PlateElement } from '@udecode/plate/react';
import { withRef } from '@udecode/cn';

export const CodeBlockElement = withRef<typeof PlateElement>(
  ({ children, className, ...props }, ref) => {
    const { element } = props;

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
