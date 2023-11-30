import { ErrorNotification, t } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { useChatMessages } from '../../hooks/chat/useChatMessages';
import { useMarkMessagesAsRead } from '../../hooks/chat/useMarkMessagesAsRead';
import { ChatMessage } from '../../providers/ChatProvider';
import { Conversation } from '../../providers/ConversationProvider';
import { ChatMessageItem } from './Detail/ChatMessageItem';
import { ChatActions } from './Detail/ContextMenu';
import { useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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

  useMarkMessagesAsRead({ conversation, messages: flattenedMsgs });
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
    getItemKey: (index) => flattenedMsgs[index]?.fileId || 'loader',
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
      <ErrorNotification error={deleteMessagesError} />
      <div
        className="flex h-full w-full flex-grow flex-col-reverse overflow-auto p-5"
        ref={scrollRef}
        key={conversation?.fileId}
      >
        <div
          className="relative w-full flex-shrink-0 overflow-hidden"
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
          </div>
        </div>
      </div>
    </>
  );
};
