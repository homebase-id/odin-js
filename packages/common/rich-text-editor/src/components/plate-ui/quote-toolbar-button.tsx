'use client';

import { withRef } from '@udecode/cn';
import { ToolbarButton } from './toolbar';
import { RichTextQuote } from '../../../../common-app/src/ui/Icons';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { useEditorState } from '@udecode/plate-core/react';
import { toggleBlock } from '@udecode/plate-core';
import { collapseSelection, findNode, isBlock, isCollapsed, TElement } from '@udecode/plate-common';
import { focusEditor } from '@udecode/plate-common/react';

export const QuoteToolbarButton = withRef<typeof ToolbarButton>((_props, ref) => {
  const editor = useEditorState();

  const type = BlockquotePlugin.key;

  let isQuote = false;
  if (isCollapsed(editor?.selection)) {
    const entry = findNode<TElement>(editor!, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      match: (n: any) => isBlock(editor, n),
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
        toggleBlock(editor, { type });

        collapseSelection(editor);
        focusEditor(editor);
      }}
    >
      <RichTextQuote className="h-5 w-5" />
    </ToolbarButton>
  );
});
