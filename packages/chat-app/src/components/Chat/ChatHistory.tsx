import { ErrorNotification, formatToDateAgoWithRelativeDetail, t } from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useChatMessages } from '../../hooks/chat/useChatMessages';
import { useMarkMessagesAsRead } from '../../hooks/chat/useMarkMessagesAsRead';
import { ChatMessage } from '../../providers/ChatProvider';
import { UnifiedConversation } from '../../providers/ConversationProvider';
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
  setIsEmptyChat,
}: {
  conversation: HomebaseFile<UnifiedConversation> | undefined;
  setReplyMsg: (msg: HomebaseFile<ChatMessage>) => void;
  setIsEmptyChat: (isEmpty: boolean) => void;
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
    delete: { mutate: deleteMessages, error: deleteMessagesError },
  } = useChatMessages({ conversationId: conversation?.fileMetadata?.appData?.uniqueId });

  const flattenedMsgs =
    useMemo(
      () =>
        (messages?.pages?.flatMap((page) => page?.searchResults)?.filter(Boolean) ||
          []) as HomebaseFile<ChatMessage>[],
      [messages]
    ) || [];

  useEffect(() => {
    if (isFetched && (!flattenedMsgs || flattenedMsgs?.filter((msg) => msg.fileId).length === 0))
      setIsEmptyChat(true);
  }, [isFetched, flattenedMsgs]);

  useMarkMessagesAsRead({ conversation, messages: flattenedMsgs });
  const chatActions: ChatActions = {
    doReply: (msg: HomebaseFile<ChatMessage>) => setReplyMsg(msg),
    doDelete: async (msg: HomebaseFile<ChatMessage>, deleteForEveryone: boolean) => {
      if (!conversation || !msg) return;
      await deleteMessages({
        conversation: conversation,
        messages: [msg],
        deleteForEveryone: deleteForEveryone,
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
      <ErrorNotification error={deleteMessagesError} />
      <div
        className="faded-scrollbar flex w-full flex-grow flex-col-reverse overflow-auto p-2 sm:p-5"
        ref={scrollRef}
        key={conversation?.fileId}
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
              const currentDate = msg?.fileMetadata.created;

              const previousVisibleMsg = flattenedMsgs[item.index + 1];
              const previousDate = previousVisibleMsg?.fileMetadata.created;
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="flex-shrink-0 py-1"
                >
                  <DateSeperator previousDate={previousDate} date={currentDate} />
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
