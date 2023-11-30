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
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);
  const itemSize = 120;

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
  const reverseIndex = useCallback((index: number) => count - 1 - index, [count]);

  if (virtualizerRef.current && count !== virtualizerRef.current.options.count) {
    const delta = count - virtualizerRef.current.options.count;
    const nextOffset = virtualizerRef.current.scrollOffset + delta * itemSize;

    virtualizerRef.current.scrollOffset = nextOffset;
    virtualizerRef.current.scrollToOffset(nextOffset, { align: 'start' });
  }

  const virtualizer = useVirtualizer({
    getScrollElement: () => scrollRef.current,
    count,
    estimateSize: () => itemSize,
    getItemKey: useCallback(
      (index: number) => flattenedMsgs[reverseIndex(index)]?.fileId || 'loader',
      [flattenedMsgs, reverseIndex]
    ),
    overscan: 2,
    // scrollMargin: 50,
  });

  useIsomorphicLayoutEffect(() => {
    virtualizerRef.current = virtualizer;
  });

  const items = virtualizer.getVirtualItems();

  const [paddingTop, paddingBottom] =
    items.length > 0
      ? [
          Math.max(0, items[0].start - virtualizer.options.scrollMargin),
          Math.max(0, virtualizer.getTotalSize() - items[items.length - 1].end),
        ]
      : [0, 0];

  useEffect(() => {
    const [firstItem] = [...virtualizer.getVirtualItems()];

    if (!firstItem) return;
    if (firstItem.index === 0 && hasMoreMessages && !isFetchingNextPage) fetchNextPage();
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
      <div className="h-full w-full flex-grow overflow-auto p-5" ref={scrollRef}>
        <div
          className="w-full"
          style={{
            overflowAnchor: 'none',
            paddingTop,
            paddingBottom,
          }}
        >
          {items.map((item) => {
            const isLoaderRow = item.index === 0;
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

            const index = reverseIndex(item.index);
            const msg = flattenedMsgs[index];

            return (
              <div
                key={item.key}
                data-index={item.index}
                data-reverse-index={index}
                ref={virtualizer.measureElement}
                className="pb-2"
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
    </>
  );
};
