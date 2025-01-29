import { cn, withRef } from '@udecode/cn';
import { useElement } from '@udecode/plate/react';
import { useFocused, useSelected } from 'slate-react';
import { PlateElement } from '../../components/plate-ui/plate-element';
import { TMentionElement } from './MentionDropdownPlugin';

export const MentionDropdownElement = withRef<
  typeof PlateElement,
  {
    renderLabel?: (mention: TMentionElement) => string;
  }
>(({ children, className, renderLabel, ...props }, ref) => {
  const element = useElement<TMentionElement>();
  const selected = useSelected();
  const focused = useFocused();

  return (
    <PlateElement
      className={cn(
        'inline-block cursor-pointer rounded-md bg-page-background px-1 py-1 align-baseline text-sm font-medium text-primary',
        selected && focused && 'ring-ring ring-2',
        element.children[0].bold === true && 'font-bold',
        element.children[0].italic === true && 'italic',
        element.children[0].underline === true && 'underline',
        className
      )}
      contentEditable={false}
      data-slate-value={element.value}
      ref={ref}
      {...props}
    >
      @{(renderLabel ? renderLabel(element) : element.value).replace('@', '')}
      {children}
    </PlateElement>
  );
});
