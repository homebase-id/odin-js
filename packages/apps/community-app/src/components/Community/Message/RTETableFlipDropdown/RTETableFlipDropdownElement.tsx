import {cn, withRef} from '@udecode/cn';
import {useFocused, useSelected} from 'slate-react';
import {TChannelElement} from './RTEChannelDropdownPlugin';
import {PlateElement, useElement} from '@udecode/plate/react';

export const RTETableFlipDropdownElement = withRef<
  typeof PlateElement,
  {
    renderLabel?: (channel: TChannelElement) => string;
  }
>(({children, className, renderLabel, ...props}, ref) => {
  const element = useElement<TChannelElement>();
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
      {renderLabel ? renderLabel(element) : element.value}
      {children}
    </PlateElement>
  );
});
