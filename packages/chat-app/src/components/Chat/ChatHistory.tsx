import { ErrorNotification, t } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { useChatMessages } from '../../hooks/chat/useChatMessages';
import { useMarkMessagesAsRead } from '../../hooks/chat/useMarkMessagesAsRead';
import { ChatMessage } from '../../providers/ChatProvider';
import { Conversation } from '../../providers/ConversationProvider';
import { ChatMessageItem } from './Detail/ChatMessageItem';
import { ChatActions } from './Detail/ContextMenu';
import { useMemo, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useVirtualizer, Virtualizer } from '@tanstack/react-virtual';

// Following: https://codesandbox.io/p/devbox/frosty-morse-scvryz?file=%2Fpages%2Findex.js%3A175%2C23
// and https://github.com/TanStack/virtual/discussions/195

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const ChatHistory = ({
  conversation,
  setReplyMsg,
}: {
  conversation: DriveSearchResult<Conversation> | undefined;
  setReplyMsg: (msg: DriveSearchResult<ChatMessage>) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    all: { data: messages, hasNextPage: hasMoreMessages, fetchNextPage, isFetchingNextPage },
    delete: { mutate: deleteMessages, error: deleteMessagesError },
  } = useChatMessages({ conversationId: conversation?.fileMetadata?.appData?.uniqueId });
  const flattenedMsgs = useMemo(
    () =>
      (messages?.pages.flatMap((page) => page.searchResults).filter(Boolean) ||
        []) as DriveSearchResult<ChatMessage>[],
    [messages]
  );

  // useMarkMessagesAsRead({ conversation, messages: flattenedMsgs });

  const chatActions: ChatActions = {
    doReply: (msg: DriveSearchResult<ChatMessage>) => setReplyMsg(msg),
    doDelete: async (msg: DriveSearchResult<ChatMessage>) => {
      if (!conversation || !msg) return;
      await deleteMessages({
        conversation: conversation,
        messages: [msg],
        deleteForEveryone: true,
      });
    },
  };

  const count = flattenedMsgs?.length + 1;
  // // Scrolls to bottom on first load
  // if (virtualizerRef.current && count !== virtualizerRef.current.options.count) {
  //   const delta = count - virtualizerRef.current.options.count;
  //   const nextOffset = virtualizerRef.current.scrollOffset + delta * itemSize;
  //   virtualizerRef.current.scrollOffset = nextOffset;
  //   virtualizerRef.current.scrollToOffset(nextOffset, { align: 'start' });
  // }

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
    overscan: 0,
    getItemKey: (index) => flattenedMsgs[index]?.fileId || 'loader',
  });

  // useIsomorphicLayoutEffect(() => {
  //   virtualizerRef.current = virtualizer;
  // });

  const items = virtualizer.getVirtualItems();

  const [paddingBottom, paddingTop] =
    items.length > 0
      ? [
          Math.max(0, items[0].start - virtualizer.options.scrollMargin),
          Math.max(0, virtualizer.getTotalSize() - items[items.length - 1].end),
        ]
      : [0, 0];

  // useEffect(() => {
  //   const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

  //   if (!lastItem) return;
  //   if (lastItem.index >= flattenedMsgs?.length - 1 && hasMoreMessages && !isFetchingNextPage)
  //     fetchNextPage();
  // }, [
  //   hasMoreMessages,
  //   fetchNextPage,
  //   flattenedMsgs?.length,
  //   isFetchingNextPage,
  //   virtualizer.getVirtualItems(),
  // ]);

  return (
    <>
      <ErrorNotification error={deleteMessagesError} />
      <div
        className="flex h-full w-full flex-grow flex-col-reverse overflow-auto p-5"
        ref={scrollRef}
        key={conversation?.fileId}
      >
        <div className="flex h-full w-full flex-col-reverse">
          <div className="flex-shrink-0" style={{ height: paddingBottom }}></div>
          {items.map((item) => {
            const isLoaderRow = item.index > flattenedMsgs.length - 1;
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
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="flex-shrink-0 py-1"
              >
                <ChatMessageItem
                  key={msg.fileId}
                  msg={msg}
                  conversation={conversation}
                  chatActions={chatActions}
                />
              </div>
            );
          })}
          <div className="flex-shrink-0" style={{ height: paddingTop }}></div>
        </div>
      </div>
    </>
  );
};
