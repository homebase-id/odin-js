import { lazy, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { cn, withRef } from '@udecode/cn';
import { PlateEditor } from '@udecode/plate-core/react';
import { getEditorPlugin, TNode } from '@udecode/plate';

import { ErrorNotification, getPlainTextFromRichText } from '@homebase-id/common-app';
import { useCommunityChannels } from '../../../../hooks/community/channels/useCommunityChannels';
import { useCommunity } from '../../../../hooks/community/useCommunity';
import { useCommunityChannel } from '../../../../hooks/community/channels/useCommunityChannel';

import { ELEMENT_CHANNEL } from './RTEChannelDropdownPlugin';

const PlateElement = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.PlateElement,
  }))
);

const RTEDropdown = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.RTEDropdown,
  }))
);
import { type DropdownValue } from '@homebase-id/rich-text-editor';

const onSelectItem = (editor: PlateEditor, item: DropdownValue, node: TNode) => {
  const { getOptions } = getEditorPlugin(editor, {
    key: ELEMENT_CHANNEL,
  });
  const { insertSpaceAfterChannel } = getOptions();

  if (node) {
    const path = editor.api.findPath(node);
    editor.tf.removeNodes({ at: path });
  }

  editor.tf.insertNodes({
    children: [{ text: '' }],
    type: ELEMENT_CHANNEL,
    value: item.label,
    uniqueId: item.value,
  });

  // move the selection after the element
  editor.tf.move({ unit: 'offset' });

  const pathAbove = editor.api.block({ above: true })?.[1];
  const isBlockEnd =
    editor.selection && pathAbove && editor.api.isEnd(editor.selection.anchor, pathAbove);

  if (isBlockEnd && insertSpaceAfterChannel) {
    editor.tf.insertText(' ');
  }
};

const onCancel = (editor: PlateEditor, value: string, node: TNode) => {
  const path = editor.api.findPath(node);
  if (!path) return;

  editor.tf.replaceNodes({ text: value }, { at: path, select: true });
};

export const RTEChannelDropdownInputElement = withRef<typeof PlateElement>(
  ({ className, ...props }, ref) => {
    const { children, editor, element } = props;
    const value = useMemo(() => getPlainTextFromRichText(element.children), [element.children]);

    return (
      <PlateElement as="span" ref={ref} {...props} className={cn('relative', className)}>
        <ChannelDropdown
          searchVal={value}
          onSelect={(channelItem) => onSelectItem(editor, channelItem, element)}
          onCancel={(clear) => onCancel(editor, clear ? '' : `${element.trigger}${value}`, element)}
        />
        {children}
      </PlateElement>
    );
  }
);

const ChannelDropdown = ({
  searchVal,
  onSelect,
  onCancel,
}: {
  searchVal?: string;
  onSelect: (value: DropdownValue) => void;
  onCancel: (clear?: boolean) => void;
}) => {
  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const { mutateAsync: createCommunityChannel } = useCommunityChannel().create;
  const [creationError, setCreationError] = useState<unknown | null>(null);

  const { data: channelTargets } = useCommunityChannels({
    odinId: odinKey,
    communityId: communityKey,
  }).fetch;

  const channels: DropdownValue[] = useMemo(
    () =>
      channelTargets?.map((chnl) => ({
        label: chnl.fileMetadata.appData.content.title,
        value: chnl.fileMetadata.appData.uniqueId as string,
      })) || [],
    [channelTargets]
  );

  const onCreate = community
    ? () => {
        const newChannelValue = createCommunityChannel({
          community,
          channelName: searchVal || '',
        }).then(
          (newUniqueId) => {
            setCreationError(null);
            return {
              label: searchVal || '',
              value: newUniqueId,
            };
          },
          (error) => {
            setCreationError(error);
            return { label: '', value: '' };
          }
        );

        return newChannelValue;
      }
    : undefined;

  return (
    <>
      <ErrorNotification error={creationError} />
      <RTEDropdown
        trigger="#"
        items={channels}
        onSelect={onSelect}
        onCancel={onCancel}
        onCreate={onCreate}
        searchVal={searchVal}
      />
    </>
  );
};
