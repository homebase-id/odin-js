import { useMemo } from 'react';

import { cn, withRef } from '@udecode/cn';
import { PlateEditor } from '@udecode/plate-core/react';
import { getEditorPlugin, TNode } from '@udecode/plate';
import { DropdownValue, RTEDropdown } from '../Dropdown/RTEDropdown';
import { ELEMENT_MENTION } from './MentionDropdownPlugin';
import { getPlainTextFromRichText } from '@homebase-id/common-app';
import { PlateElement } from '../../components/plate-ui/plate-element';
import { useMentionableContext } from './context/useMentionableContext';

const onSelectItem = (editor: PlateEditor, item: DropdownValue, node: TNode) => {
  const { getOptions } = getEditorPlugin(editor, {
    key: ELEMENT_MENTION,
  });
  const { insertSpaceAfterMention } = getOptions();

  if (node) {
    const path = editor.api.findPath(node);
    editor.tf.removeNodes({ at: path });
  }

  editor.tf.insertNodes({
    children: [{ text: '' }],
    type: ELEMENT_MENTION,
    value: item.value,
  });

  // move the selection after the element
  editor.tf.move({ unit: 'offset' });

  const pathAbove = editor.api.block({ above: true })?.[1];
  const isBlockEnd =
    editor.selection && pathAbove && editor.api.isEnd(editor.selection.anchor, pathAbove);

  if (isBlockEnd && insertSpaceAfterMention) {
    editor.tf.insertText(' ');
  }
};

const onCancel = (editor: PlateEditor, value: string, node: TNode) => {
  const path = editor.api.findPath(node);
  if (!path) return;

  editor.tf.replaceNodes({ text: value }, { at: path, select: true });
};

export const MentionDropdownInputElement = withRef<typeof PlateElement>(
  ({ className, ...props }, ref) => {
    const { children, editor, element } = props;
    const value = useMemo(() => getPlainTextFromRichText(element.children), [element.children]);

    const mentionables = useMentionableContext();
    // const mentionables = options?.mentionables;

    if (!mentionables) return null;

    return (
      <PlateElement as="span" ref={ref} {...props} className={cn('relative', className)}>
        <RTEDropdown
          trigger="@"
          items={mentionables || []}
          onSelect={(channelItem) => onSelectItem(editor, channelItem, element)}
          onCancel={(clear) => onCancel(editor, clear ? '' : `${element.trigger}${value}`, element)}
          searchVal={value}
        />
        {children}
      </PlateElement>
    );
  }
);
