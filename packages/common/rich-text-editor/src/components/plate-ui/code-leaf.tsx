import { cn, withRef } from '@udecode/cn';
import { CodePlugin } from '@udecode/plate-basic-marks/react';
import { isHotkey, isSelectionAtBlockEnd } from '@udecode/plate-common';
import { PlateLeaf } from '@udecode/plate-common/react';
import { useEffect } from 'react';

export const CodeLeaf = withRef<typeof PlateLeaf>(({ children, className, ...props }, ref) => {
  const arrowRightPressed = isHotkey('arrowright');

  useEffect(() => {
    const eventHandler = (e: KeyboardEvent) => {
      if (arrowRightPressed(e) && isSelectionAtBlockEnd(props.editor))
        props.editor.removeMark(CodePlugin.key);
    };

    window.addEventListener('keydown', eventHandler);
    return () => window.removeEventListener('keydown', eventHandler);
  }, [props.editor]);

  return (
    <PlateLeaf
      ref={ref}
      asChild
      className={cn(
        'rounded-md border bg-slate-100 p-[2px_3px_1px] font-mono text-sm text-red-500  dark:bg-slate-800 dark:text-orange-400',
        className
      )}
      {...props}
    >
      <code>{children}</code>
    </PlateLeaf>
  );
});
