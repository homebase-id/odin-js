import { HomebaseFile, RichText } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import {
  COMMUNITY_MESSAGE_FILE_TYPE,
  CommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ErrorNotification,
  findMentionedInRichText,
  formatToDateAgoWithRelativeDetail,
  t,
  useDotYouClient,
} from '@homebase-id/common-app';
import { CommunityMessageItem } from '../Message/CommunityMessageItem';
import { useCommunityMessages } from '../../../hooks/community/messages/useCommunityMessages';
import { CommunityActions } from './ContextMenu';
import { useCommunityMetadata } from '../../../hooks/community/useCommunityMetadata';

export const CommunityHistory = ({
  community,
  channel,
  origin,
  doOpenThread,
  setIsEmptyChat,
  alignTop,
  onlyNew,
  emptyPlaceholder,
  setParticipants,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
  origin?: HomebaseFile<CommunityMessage>;
  doOpenThread?: (msg: HomebaseFile<CommunityMessage>) => void;
  setIsEmptyChat?: (isEmpty: boolean) => void;
  alignTop?: boolean;
  onlyNew?: boolean;
  emptyPlaceholder?: ReactNode;
  setParticipants?: React.Dispatch<React.SetStateAction<string[] | null | undefined>>;
}) => {
  const identity = useDotYouClient().getIdentity();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inAThread =
    !!origin && origin.fileMetadata.appData.fileType === COMMUNITY_MESSAGE_FILE_TYPE;

  const { data: metadata } = useCommunityMetadata({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata?.appData?.uniqueId,
  }).single;
  const lastReadTime =
    (channel?.fileMetadata.appData.uniqueId &&
      metadata?.fileMetadata.appData.content.channelLastReadTime[
        channel?.fileMetadata.appData.uniqueId
      ]) ||
    0;

  const {
    all: {
      data: messages,
      hasNextPage: hasMoreMessages,
      fetchNextPage,
      isFetchingNextPage,
      isFetched,
    },
    delete: { mutate: deleteMessages, error: deleteMessagesError },
  } = useCommunityMessages({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata?.appData?.uniqueId,
    channelId: channel?.fileMetadata?.appData?.uniqueId,
    threadId: origin?.fileMetadata.globalTransitId,
    maxAge: onlyNew ? lastReadTime : undefined,
  });

  const flattenedMsgs =
    useMemo(() => {
      const flat = (messages?.pages?.flatMap((page) => page?.searchResults)?.filter(Boolean) ||
        []) as HomebaseFile<CommunityMessage>[];

      if (inAThread) {
        flat.push(origin as HomebaseFile<CommunityMessage>);
      }

      return flat;
    }, [messages, origin]) || [];

  useEffect(() => {
    if (setIsEmptyChat && isFetched && (!flattenedMsgs || flattenedMsgs.length === 0))
      setIsEmptyChat(true);
  }, [isFetched, flattenedMsgs]);

  //   useMarkMessagesAsRead({ conversation, messages: flattenedMsgs });
  const communityActions: CommunityActions = {
    doDelete: async (msg: HomebaseFile<CommunityMessage>) => {
      if (!community || !msg) return;

      await deleteMessages({
        community: community,
        messages: [msg],
      });
    },
  };

  if (doOpenThread && !inAThread)
    communityActions.doReply = (msg: HomebaseFile<CommunityMessage>) => doOpenThread(msg);

  const count = flattenedMsgs?.length + 1;
  const virtualizer = useVirtualizer({
    getScrollElement: () => scrollRef.current,
    count,
    estimateSize: () => 300,
    // Custom scroll handler to support inverted rendering with flex-col-reverse
    observeElementOffset: (instance, cb) => {
      const element = instance.scrollElement;
      if (!element) return;

      // Math.abs as the element.scrollTop will be negative with flex-col-reverse
      const handler = () => cb(Math.abs(element.scrollTop));
      // Start scroll is always 0, as flex-col-reverse starts at the bottom
      cb(0);

      element.addEventListener('scroll', handler, {
        passive: true,
      });

      return () => element.removeEventListener('scroll', handler);
    },
    overscan: 5,
    getItemKey: (index) => flattenedMsgs[index]?.fileId || `loader-${index}`,
  });

  const items = virtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) return;
    if (lastItem.index >= flattenedMsgs?.length - 1 && hasMoreMessages && !isFetchingNextPage)
      fetchNextPage();
  }, [
    hasMoreMessages,
    fetchNextPage,
    flattenedMsgs?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  useEffect(() => {
    if (setParticipants && inAThread) {
      const involvedAuthors = flattenedMsgs.map((msg) => msg.fileMetadata.originalAuthor);
      const mentionedAuthors = flattenedMsgs
        .map((msg) =>
          Array.isArray(msg.fileMetadata.appData.content.message)
            ? findMentionedInRichText(msg.fileMetadata.appData.content.message)
            : []
        )
        .flat();

      setParticipants(Array.from(new Set([...involvedAuthors, ...mentionedAuthors])) || []);
    }
  }, [flattenedMsgs, setParticipants]);

  if (emptyPlaceholder && isFetched && (!flattenedMsgs || flattenedMsgs.length === 0)) {
    return <>{emptyPlaceholder}</>;
  }

  return (
    <>
      <ErrorNotification error={deleteMessagesError} />
      <div
        className={`flex w-full ${alignTop ? '' : 'flex-grow'} faded-scrollbar flex-col-reverse overflow-auto py-0 sm:py-1 lg:py-5`}
        ref={scrollRef}
        key={channel?.fileId || community?.fileId}
        onCopyCapture={(e) => {
          const range = window.getSelection()?.getRangeAt(0),
            rangeContents = range?.cloneContents(),
            helper = document.createElement('div');

          if (rangeContents) helper.appendChild(rangeContents);
          const elements = helper.getElementsByClassName('copyable-content');
          if (elements.length === 0) return;

          let runningText = '';
          for (let i = elements.length - 1; i >= 0; i--) {
            const text = (elements[i] as HTMLElement).innerText;
            if (text?.length) {
              runningText += text + '\n';
            }
          }

          e.clipboardData.setData('text/plain', runningText);
          e.preventDefault();
          return false;
        }}
      >
        <div
          className="relative w-full flex-shrink-0 flex-grow-0 overflow-hidden" // This overflow-hidden cuts of the context-menu of the first chat-items; But we need it as it otherwise breaks the scroll edges
          style={{
            height: virtualizer.getTotalSize(),
          }}
        >
          <div
            className="absolute left-0 top-0 flex h-full w-full flex-col-reverse"
            style={{
              transform: `translateY(-${items[0]?.start ?? 0}px)`,
            }}
          >
            {items.map((item) => {
              const isLoaderRow = item.index > flattenedMsgs?.length - 1;
              if (isLoaderRow) {
                return (
                  <div key={item.key} data-index={item.index} ref={virtualizer.measureElement}>
                    {hasMoreMessages || isFetchingNextPage ? (
                      <div className="animate-pulse" key={'loading'}>
                        {t('Loading...')}
                      </div>
                    ) : null}
                  </div>
                );
              }

              const msg = flattenedMsgs[item.index];
              const currentAuthor = msg?.fileMetadata.originalAuthor || identity || '';
              const currentDate = msg?.fileMetadata.created;

              const previousVisibleMsg = flattenedMsgs[item.index + 1];
              const previousAuthor =
                previousVisibleMsg?.fileMetadata.originalAuthor || identity || '';
              const previousDate = previousVisibleMsg?.fileMetadata.created;

              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="flex-shrink-0"
                >
                  <DateSeperator previousDate={previousDate} date={currentDate} />
                  <CommunityMessageItem
                    key={msg.fileId}
                    msg={msg}
                    community={community}
                    communityActions={communityActions}
                    hideDetails={
                      previousAuthor === currentAuthor &&
                      Math.abs(previousDate - currentDate) < 1000 * 60 * 5
                    }
                    hideThreads={inAThread}
                    className="px-2 py-1 md:px-3"
                    showChannelName={!channel && !inAThread}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

const DateSeperator = ({ previousDate, date }: { previousDate?: number; date?: number }) => {
  if (!date) return null;

  const previousDay = previousDate && new Date(previousDate).getDate();
  const day = new Date(date).getDate();

  if (previousDay === day) return null;

  return (
    <div className="flex justify-center py-2">
      <div className="rounded-full bg-page-background px-3 py-2 text-sm font-medium text-foreground">
        {formatToDateAgoWithRelativeDetail(new Date(date))}
      </div>
    </div>
  );
};
