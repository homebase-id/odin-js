import {
  ErrorNotification,
  t,
  useMostSpace,
  usePortal,
  VolatileInputAutoCompleteProps,
} from '@homebase-id/common-app';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCommunityChannels } from '../../../hooks/community/channels/useCommunityChannels';
import { useParams } from 'react-router-dom';
import { useCommunity } from '../../../hooks/community/useCommunity';
import { useCommunityChannel } from '../../../hooks/community/channels/useCommunityChannel';

export const ChannelAutocompleteDropdown = ({
  query,
  onInput,
  position,
}: VolatileInputAutoCompleteProps) => {
  const target = usePortal('channel-container');
  const enabled = !!(query && query.startsWith('#'));

  const { communityKey } = useParams();
  const { data: community } = useCommunity({ communityId: communityKey }).fetch;
  const { data: channelTargets } = useCommunityChannels({
    communityId: enabled ? communityKey : undefined,
  }).fetch;
  const {
    mutate: createCommunityChannel,
    status: creationStatus,
    error: creationError,
  } = useCommunityChannel().create;

  const slicedQuery = query?.slice(1);
  const channels = useMemo(
    () =>
      slicedQuery && channelTargets?.length
        ? (channelTargets
            ?.map((dsr) => dsr.fileMetadata.appData.content)
            ?.filter((trgt) => trgt.title && trgt.title.includes(slicedQuery))
            ?.map((trgt) => ({
              name: trgt.title,
            })) as { name: string }[])
        : [],
    [slicedQuery, channelTargets]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  useEffect(() => setActiveIndex(0), [query]);

  const handleSelect = (index: number) => {
    if (channels && channels[index]) {
      doInput(channels[index].name);
    } else if (index === 0 && query && community) {
      const channelName = query.slice(1);
      createCommunityChannel({
        community,
        channelName,
      });
    }
  };
  const doInput = (odinId: string) => onInput(`#${odinId} `);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !query || creationStatus === 'pending') return;

      if (event.key === 'ArrowDown') setActiveIndex((index) => index + 1);
      else if (event.key === 'ArrowUp') setActiveIndex((index) => index - 1);
      else if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey)
        handleSelect(activeIndex);
      else if (event.key === 'Tab') handleSelect(activeIndex);
      else return;

      event.stopPropagation();
      event.preventDefault();
    },
    [channels, activeIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!enabled) return null;

  const dialog = (
    <div
      style={
        position
          ? { left: position.x, top: position.y, position: 'fixed', bottom: 'auto', height: '1rem' }
          : undefined
      }
      className="z-50"
      ref={wrapperRef}
    >
      <ErrorNotification error={creationError} />
      <ul
        className={`absolute flex flex-col overflow-hidden rounded-md bg-background py-2 text-foreground shadow-md ${
          verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
        }
        ${horizontalSpace === 'left' ? 'right-0' : 'left-0'}`}
      >
        {channels?.length ? (
          <>
            {channels?.slice(0, 5)?.map((channel, index) => (
              <li
                key={channel.name}
                className={`w-40 cursor-pointer px-2 transition-colors ${
                  index === activeIndex
                    ? 'bg-indigo-200 dark:bg-indigo-800'
                    : 'hover:bg-indigo-200 dark:hover:bg-indigo-800'
                }`}
                onClick={() => handleSelect(activeIndex)}
              >
                #{channel.name}
              </li>
            ))}
          </>
        ) : (
          <li
            className={`flex w-60 cursor-pointer px-2 transition-colors ${
              0 === activeIndex
                ? 'bg-indigo-200 dark:bg-indigo-800'
                : 'hover:bg-indigo-200 dark:hover:bg-indigo-800'
            }`}
            onClick={() => handleSelect(0)}
          >
            {creationStatus === 'pending' ? (
              t('Creating...')
            ) : (
              <>
                {t('Create')} &quot;{query}&quot;
              </>
            )}
          </li>
        )}
      </ul>
    </div>
  );

  return createPortal(dialog, target);
};
