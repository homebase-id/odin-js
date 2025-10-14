import { cn, withRef } from '@udecode/cn';
import { PlateElement, useElement } from '@udecode/plate/react';
import type { TReferencedMessageElement } from './RTEReferencedMessagePlugin';
import { Link } from '@homebase-id/common-app/icons';

export const RTEReferencedMessageElement = withRef<typeof PlateElement>(
  ({ className, children, ...props }, ref) => {
    const element = useElement<TReferencedMessageElement>();
    return (
      <PlateElement
        ref={ref}
        {...props}
        // Inline with an icon adornment and single-line layout
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap rounded bg-primary/10 px-1 align-baseline text-primary',
          className
        )}
        data-messageid={element.messageId}
        data-threadid={element.threadId}
        data-channelid={element.channelId}
        data-odinid={element.odinId}
        data-communityid={element.communityId}
      >
        <span className="inline-flex items-center" contentEditable={false}>
          <Link className="pointer-events-none h-4 w-4 shrink-0 select-none" aria-hidden="true" />
        </span>
        <span className="whitespace-nowrap">{children}</span>
      </PlateElement>
    );
  }
);

RTEReferencedMessageElement.displayName = 'RTEReferencedMessageElement';
