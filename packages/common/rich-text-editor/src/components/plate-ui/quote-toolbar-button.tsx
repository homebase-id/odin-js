import { withRef } from '@udecode/cn';
import { ToolbarButton } from './toolbar';
import { RichTextQuote } from '../../../../common-app/src/ui/Icons';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { useEditorState } from '@udecode/plate-core/react';

import { RangeApi, TElement } from '@udecode/plate';

export const QuoteToolbarButton = withRef<typeof ToolbarButton>((_props, ref) => {
  const editor = useEditorState();

  const type = BlockquotePlugin.key;

  let isQuote = false;
  if (RangeApi.isCollapsed(editor?.selection)) {
    const entry = editor.api.node<TElement>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      match: (n: any) => editor.api.isBlock(n),
    });
    if (entry) {
      isQuote = entry[0].type === type;
    }
  }

  return (
    <ToolbarButton
      ref={ref}
      tooltip={'Quote'}
      pressed={isQuote}
      onClick={() => {
        editor.tf.toggleBlock(type);

        editor.tf.collapse();
        editor.tf.focus();
      }}
    >
      <RichTextQuote className="h-5 w-5" />
    </ToolbarButton>
  );
});
