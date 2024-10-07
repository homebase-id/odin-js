import React from 'react';

import type { TMentionElement } from '@udecode/plate-mention';

import { cn, withRef } from '@udecode/cn';
import { getHandler } from '@udecode/plate-common';
import { useElement } from '@udecode/plate-common/react';
import { IS_APPLE } from '@udecode/utils';
import { useFocused, useSelected } from 'slate-react';

import { PlateElement } from './plate-element';

export const MentionElement = withRef<
  typeof PlateElement,
  {
    prefix?: string;
    renderLabel?: (mentionable: TMentionElement) => string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick?: (mentionNode: any) => void;
  }
>(({ children, className, prefix, renderLabel, onClick, ...props }, ref) => {
  const element = useElement<TMentionElement>();
  const selected = useSelected();
  const focused = useFocused();
  const mounted = useMounted();

  return (
    <PlateElement
      ref={ref}
      className={cn(
        'bg-page-background inline-block cursor-pointer rounded-md px-1 py-1 align-baseline text-sm font-medium text-primary',
        selected && focused && 'ring-2 ring-ring',
        element.children[0].bold === true && 'font-bold',
        element.children[0].italic === true && 'italic',
        element.children[0].underline === true && 'underline',
        className
      )}
      onClick={getHandler(onClick, element)}
      data-slate-value={element.value}
      contentEditable={false}
      {...props}
    >
      {mounted && IS_APPLE ? (
        // Mac OS IME https://github.com/ianstormtaylor/slate/issues/3490
        <React.Fragment>
          {children}
          {prefix}
          {renderLabel ? renderLabel(element) : element.value}
        </React.Fragment>
      ) : (
        // Others like Android https://github.com/ianstormtaylor/slate/pull/5360
        <React.Fragment>
          {prefix}
          {renderLabel ? renderLabel(element) : element.value}
          {children}
        </React.Fragment>
      )}
    </PlateElement>
  );
});

function useMounted() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
