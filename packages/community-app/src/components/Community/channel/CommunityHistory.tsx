import { HomebaseFile } from '@youfoundation/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { t } from '@youfoundation/common-app';
import { CommunityMessageItem } from '../Message/CommunityMessageItem';
import { useCommunityMessages } from '../../../hooks/community/messages/useCommunityMessages';
import { CommunityActions } from './ContextMenu';

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const CommunityHistory = ({
  community,
  channel,
  setReplyMsg,
  setIsEmptyChat,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel?: HomebaseFile<CommunityChannel> | undefined;
  setReplyMsg: (msg: HomebaseFile<CommunityMessage>) => void;
  setIsEmptyChat?: (isEmpty: boolean) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    all: {
      data: messages,
      hasNextPage: hasMoreMessages,
      fetchNextPage,
      isFetchingNextPage,
      isFetched,
    },
    // delete: { mutate: deleteMessages, error: deleteMessagesError },
  } = useCommunityMessages({
    communityId: community?.fileMetadata?.appData?.uniqueId,
    // channelId: channel?.fileMetadata?.appData?.uniqueId,
  });

  const flattenedMsgs =
    useMemo(
      () =>
        (messages?.pages?.flatMap((page) => page?.searchResults)?.filter(Boolean) ||
          []) as HomebaseFile<CommunityMessage>[],
      [messages]
    ) || [];

  useEffect(() => {
    if (
      setIsEmptyChat &&
      isFetched &&
      (!flattenedMsgs || flattenedMsgs?.filter((msg) => msg.fileId).length === 0)
    )
      setIsEmptyChat(true);
  }, [isFetched, flattenedMsgs]);

  //   useMarkMessagesAsRead({ conversation, messages: flattenedMsgs });
  const communityActions: CommunityActions = {
    doReply: (msg: HomebaseFile<CommunityMessage>) => setReplyMsg(msg),
    doDelete: async (msg: HomebaseFile<CommunityMessage>, deleteForEveryone: boolean) => {
      if (!community || !msg) return;
      throw new Error('Not implemented');
      // await deleteMessages({
      //   conversation: conversation,
      //   messages: [msg],
      //   deleteForEveryone: deleteForEveryone,
      // });
    },
  };

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

  return (
    <>
      {/* <ErrorNotification error={deleteMessagesError} /> */}
      <div
        className="flex w-full flex-grow flex-col-reverse overflow-auto py-2 sm:py-5"
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
            const text = (elements[i] as any).innerText;
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
                  <div
                    key={item.key}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    className="sm:min-h-[22rem]"
                    // h-22rem keeps space for the context menu/emoji selector of the first item; otherwise the context menu would be cut off by the overflow-hidden
                  >
                    {hasMoreMessages || isFetchingNextPage ? (
                      <div className="animate-pulse" key={'loading'}>
                        {t('Loading...')}
                      </div>
                    ) : null}
                  </div>
                );
              }

              const msg = flattenedMsgs[item.index];
              const currentAuthor =
                msg?.fileMetadata?.appData?.content.authorOdinId ||
                msg?.fileMetadata.senderOdinId ||
                '';
              const currentDate = msg?.fileMetadata.created;

              const previousVisibleMsg = flattenedMsgs[item.index + 1];
              const previousAuthor =
                previousVisibleMsg?.fileMetadata?.appData?.content.authorOdinId ||
                previousVisibleMsg?.fileMetadata.senderOdinId ||
                '';
              const previousDate = previousVisibleMsg?.fileMetadata.created;

              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="flex-shrink-0"
                >
                  <CommunityMessageItem
                    key={msg.fileId}
                    msg={msg}
                    community={community}
                    communityActions={communityActions}
                    hideDetails={
                      previousAuthor === currentAuthor && previousDate - currentDate < 1000 * 60 * 5
                    }
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
