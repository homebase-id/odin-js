import { lazy, Ref, RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { cn, withRef } from '@udecode/cn';

import { TChannel } from './RTEChannelDropdownPlugin';

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxInput,
  InlineComboboxItem,
  InlineComboboxSeleactableEmpty,
} from '@homebase-id/rich-text-editor';
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

const PlateElement = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.PlateElement,
  }))
);
import { getChannelOnSelectItem } from './RTEChannelGetChannelOnSelect';
import { createPortal } from 'react-dom';

// TODO: Extend with cleanup of input element
const onSelectItem = getChannelOnSelectItem();

export const RTEChannelDropdownInputElement = withRef<typeof PlateElement>(
  ({ className, ...props }, ref) => {
    const { children, editor, element } = props;

    const value = getPlainTextFromRichText(element.children);
    const wrapperRef = useRef<HTMLElement>(null);

    return (
      <>
        <PlateElement as="span" ref={ref} {...props} className={cn('relative', className)}>
          {/* <InlineCombobox
            element={element}
            setValue={setSearch}
            showTrigger={true}
            trigger="#"
            value={search}
            hideWhenSpace={true}
            hideWhenNoValue={true}
          >
            <span
              className={cn(
                'inline-block cursor-pointer rounded-md bg-page-background px-1 py-1 align-baseline text-sm font-medium text-primary',
                className
              )}
            >
              <InlineComboboxInput />
            </span>

            <InlineComboboxContent className="my-1.5">
              <InlineComboboxSeleactableEmpty
                onClick={() => {
                  if (!community || !search) return;
                  createCommunityChannel({
                    community,
                    channelName: search,
                  });
                }}
              >
                {creationStatus === 'pending' ? t('Creating...') : t('Create "{0}"', search)}
              </InlineComboboxSeleactableEmpty>

              {channels.map((item, index) => (
                <InlineComboboxItem
                  key={item.key || item.text || index}
                  onClick={() => onSelectItem(editor, item, search)}
                  value={item.text}
                >
                  #{item.text}
                </InlineComboboxItem>
              ))}
            </InlineComboboxContent>
          </InlineCombobox> */}

          {/* {element.trigger} */}
          <span
            ref={wrapperRef}
            data-before={element.trigger}
            className="before:content-[attr(data-before)]"
          ></span>
          <ChannelDropdown
            wrapperRef={wrapperRef}
            searchVal={value}
            onSelect={(channelItem) => onSelectItem(editor, channelItem, value, element)}
          />
          {children}
        </PlateElement>
      </>
    );
  }
);

const ChannelDropdown = ({
  wrapperRef,
  searchVal,
  onSelect,
}: {
  wrapperRef: RefObject<HTMLElement>;

  searchVal?: string;
  onSelect: (value: TChannel) => void;
}) => {
  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const {
    mutate: createCommunityChannel,
    status: creationStatus,
    error: creationError,
  } = useCommunityChannel().create;

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

  const [selectedChannel, setSelectedChannel] = useState<TChannel | null>(null);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Enter', 'Tab'].includes(e.key) && selectedChannel) {
        e.preventDefault();
        e.stopPropagation();

        onSelect(selectedChannel);
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
        setSelectedChannel(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedChannel]);

  const filteredChannels = useMemo(
    () =>
      channels.filter(
        (chnl) => !searchVal || chnl.text.toLowerCase().includes(searchVal.toLowerCase())
      ),
    [channelTargets, searchVal]
  );

  useEffect(() => {
    if (
      (!selectedChannel && filteredChannels.length > 0) ||
      (selectedChannel && !filteredChannels.includes(selectedChannel))
    ) {
      setSelectedChannel(filteredChannels[0]);
    }
  }, [filteredChannels]);

  return (
    <>
      <ErrorNotification error={creationError} />
      <FixedPortalWrapper
        wrapperRef={wrapperRef}
        className="z-10 flex flex-col rounded-md border border-gray-200 bg-white shadow-lg"
      >
        {filteredChannels?.map((item, index) => {
          const isSelected = selectedChannel === item;

          return (
            <a
              key={item.key || item.text || index}
              onClick={() => onSelect(item)}
              className={`cursor-pointer px-2 py-1 transition-colors ${isSelected ? 'bg-primary text-primary-contrast' : 'hover:bg-primary hover:text-primary-contrast'}`}
            >
              #{item.text}
            </a>
          );
        })}
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
