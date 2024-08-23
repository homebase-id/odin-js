import React from 'react';

// import type { TMentionElement } from '@udecode/plate-mention';

import { cn, withRef } from '@udecode/cn';
import { PlateElement, getHandler, useElement } from '@udecode/plate-common';
import { useFocused, useSelected } from 'slate-react';
import { TChannelElement } from './RTEChannelDropdownPlugin';

export const RTEChannelDropdownElement = withRef<
  typeof PlateElement,
  {
    onClick?: (mentionNode: any) => void;
    renderLabel?: (mentionable: TChannelElement) => string;
  }
>(({ children, className, onClick, renderLabel, ...props }, ref) => {
  const element = useElement<TChannelElement>();
  const selected = useSelected();
  const focused = useFocused();

  return (
    <PlateElement
      className={cn(
        'bg-muted inline-block cursor-pointer rounded-md px-1.5 py-0.5 align-baseline text-sm font-medium',
        selected && focused && 'ring-ring ring-2',
        element.children[0].bold === true && 'font-bold',
        element.children[0].italic === true && 'italic',
        element.children[0].underline === true && 'underline',
        className
      )}
      contentEditable={false}
      data-slate-value={element.value}
      onClick={getHandler(onClick, element)}
      ref={ref}
      {...props}
    >
      # {renderLabel ? renderLabel(element) : element.value}
      {children}
    </PlateElement>
  );
});
