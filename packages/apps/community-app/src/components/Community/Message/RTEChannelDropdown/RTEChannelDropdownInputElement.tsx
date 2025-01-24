import { lazy, RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { cn, withRef } from '@udecode/cn';

import { TChannel } from './RTEChannelDropdownPlugin';

import {
  ErrorNotification,
  getPlainTextFromRichText,
  t,
  useMostSpace,
  usePortal,
} from '@homebase-id/common-app';
import { useParams } from 'react-router-dom';
import { useCommunityChannels } from '../../../../hooks/community/channels/useCommunityChannels';
import { useCommunity } from '../../../../hooks/community/useCommunity';
import { useCommunityChannel } from '../../../../hooks/community/channels/useCommunityChannel';
import { PlateEditor } from '@udecode/plate-core/react';

const PlateElement = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.PlateElement,
  }))
);
import { getChannelOnSelectItem } from './RTEChannelGetChannelOnSelect';
import { createPortal } from 'react-dom';
import { TNode } from '@udecode/plate';

const onSelectItem = getChannelOnSelectItem();

const onCancel = (editor: PlateEditor, value: string, node: TNode) => {
  const path = editor.api.findPath(node);
  if (!path) return;

  editor.tf.replaceNodes(
    {
      type: 'p',
      children: [{ text: value }],
    },
    { at: path, select: true }
  );
};

export const RTEChannelDropdownInputElement = withRef<typeof PlateElement>(
  ({ className, ...props }, ref) => {
    const { children, editor, element } = props;

    const value = useMemo(() => getPlainTextFromRichText(element.children), [element.children]);
    const wrapperRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (value?.includes(' ')) {
        onCancel(editor, `${element.trigger}${value}`, element);
      }
    }, [value]);

    return (
      <PlateElement as="span" ref={ref} {...props} className={cn('relative', className)}>
        <span
          ref={wrapperRef}
          data-before={element.trigger}
          className="before:content-[attr(data-before)]"
        ></span>
        <ChannelDropdown
          wrapperRef={wrapperRef}
          searchVal={value}
          onSelect={(channelItem) => onSelectItem(editor, channelItem, value, element)}
          onCancel={(clear) => {
            onCancel(editor, clear ? '' : `${element.trigger}${value}`, element);
          }}
        />
        {children}
      </PlateElement>
    );
  }
);

const ChannelDropdown = ({
  wrapperRef,
  searchVal,
  onSelect,
  onCancel,
}: {
  wrapperRef: RefObject<HTMLElement>;
  searchVal?: string;
  onSelect: (value: TChannel) => void;
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

  const channels: TChannel[] = useMemo(
    () =>
      channelTargets?.map((chnl) => ({
        key: chnl.fileId,
        text: chnl.fileMetadata.appData.content.title,
        uniqueId: chnl.fileMetadata.appData.uniqueId as string,
      })) || [],
    [channelTargets]
  );

  const newChannel = useMemo(() => {
    if (!searchVal) return null;
    return {
      key: searchVal,
      text: searchVal,
      uniqueId: searchVal,
    };
  }, [searchVal]);

  const [selectedChannel, setSelectedChannel] = useState<TChannel | null>(null);
  const doSelect = async (channel: TChannel) => {
    if (channel === newChannel) {
      if (!community || !searchVal) return;

      try {
        const newChannelUniqueId = await createCommunityChannel({
          community: community,
          channelName: searchVal,
        });

        const toSelectChannel = { ...channel };
        toSelectChannel.uniqueId = newChannelUniqueId;

        // run the onSelect callback
        onSelect(toSelectChannel);
      } catch (e) {
        console.error(e);
        setCreationError(e);
      }
    } else {
      onSelect(channel);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Tab', 'Enter'].includes(e.key) && selectedChannel) {
        e.preventDefault();
        e.stopPropagation();

        doSelect(selectedChannel);
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();

        setSelectedChannel((prev) => {
          if (!prev) return prev;
          const index = channels.indexOf(prev);
          return channels[index - 1] || prev;
        });
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();

        setSelectedChannel((prev) => {
          if (!prev) return prev;
          const index = channels.indexOf(prev);
          return channels[index + 1] || prev;
        });
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        onCancel();
      }

      if (e.key === 'Backspace' && searchVal === '') {
        e.preventDefault();
        e.stopPropagation();

        onCancel(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedChannel, onCancel, searchVal]);

  const filteredChannels = useMemo(
    () =>
      channels.filter(
        (chnl) => !searchVal || chnl.text.toLowerCase().includes(searchVal.toLowerCase())
      ),
    [channelTargets, searchVal]
  );

  useEffect(() => {
    if (
      filteredChannels.length > 0 &&
      (!selectedChannel || (selectedChannel && !filteredChannels.includes(selectedChannel)))
    ) {
      setSelectedChannel(filteredChannels[0]);
    } else if (filteredChannels.length === 0 && searchVal) {
      setSelectedChannel(newChannel);
    }
  }, [filteredChannels, newChannel, searchVal]);

  if (searchVal === undefined) return null;

  return (
    <>
      <ErrorNotification error={creationError} />
      <FixedPortalWrapper
        wrapperRef={wrapperRef}
        className="z-10 flex flex-col rounded-md border border-gray-200 bg-white shadow-lg"
      >
        {filteredChannels.length === 0 && newChannel ? (
          <a
            className={`cursor-pointer px-2 py-1 transition-colors ${selectedChannel === newChannel ? 'bg-primary text-primary-contrast' : 'hover:bg-primary hover:text-primary-contrast'}`}
            onClick={() => doSelect(newChannel)}
          >
            {t('Create "{0}"', searchVal)}
          </a>
        ) : (
          filteredChannels?.map((item, index) => {
            const isSelected = selectedChannel === item;

            return (
              <a
                key={item.key || item.text || index}
                onClick={() => doSelect(item)}
                className={`cursor-pointer px-2 py-1 transition-colors ${isSelected ? 'bg-primary text-primary-contrast' : 'hover:bg-primary hover:text-primary-contrast'}`}
              >
                #{item.text}
              </a>
            );
          })
        )}
      </FixedPortalWrapper>
    </>
  );
};

const FixedPortalWrapper = ({
  wrapperRef,
  children,
  className,
}: {
  wrapperRef: RefObject<HTMLElement>;
  children: React.ReactNode;
  className?: string;
}) => {
  const target = usePortal('dropdown-root');
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  return createPortal(
    <div
      className={className}
      style={{
        position: 'fixed',
        ...(verticalSpace === 'top'
          ? {
              bottom: `calc(${window.innerHeight - (wrapperRef.current?.getBoundingClientRect().bottom || 0)}px + 1lh)`,
            }
          : { top: wrapperRef.current?.getBoundingClientRect().top || 0 }),

        ...(horizontalSpace === 'right'
          ? {
              left: wrapperRef.current?.getBoundingClientRect().left || 0,
            }
          : {
              right: window.innerWidth - (wrapperRef.current?.getBoundingClientRect().right || 0),
            }),
      }}
    >
      {children}
    </div>,
    target
  );
};
