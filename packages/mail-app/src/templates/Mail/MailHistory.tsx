import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { MailConversation } from '../../providers/MailProvider';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  ConnectionImage,
  ConnectionName,
  t,
  formatToTimeAgoWithRelativeDetail,
  RichTextRenderer,
} from '@youfoundation/common-app';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useMarkMailConversationsAsRead } from '../../hooks/mail/useMarkMailConversationsAsRead';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';

export const MailHistory = ({
  mailThread,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,

  className,
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;

  className?: string;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const count = mailThread?.length + 1;
  const virtualizer = useWindowVirtualizer({
    count,
    scrollMargin: parentOffsetRef.current,
    estimateSize: () => 300,
    overscan: 5,
    getItemKey: (index) => mailThread[index]?.fileId || `loader-${index}`,
  });

  const items = virtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= mailThread?.length - 1 && hasNextPage && !isFetchingNextPage)
      fetchNextPage();
  }, [
    hasNextPage,
    fetchNextPage,
    mailThread?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  useMarkMailConversationsAsRead({ mailThread });

  return (
    <div className={`flex ${className || ''}`} ref={parentRef}>
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: virtualizer.getTotalSize(),
        }}
      >
        <div
          className="absolute left-0 top-0 flex h-full w-full flex-col"
          style={{
            transform: `translateY(${items[0]?.start - virtualizer.options.scrollMargin}px)`,
          }}
        >
          {items.map((virtualRow) => {
            const isLoaderRow = virtualRow.index > mailThread.length - 1;
            if (isLoaderRow) {
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                >
                  {hasNextPage || isFetchingNextPage ? (
                    <div className="animate-pulse pt-5" key={'loading'}>
                      {t('Loading...')}
                    </div>
                  ) : null}
                </div>
              );
            }

            const message = mailThread[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="py-1"
              >
                <MailMessage message={message} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MailMessage = ({
  message,
  className,
}: {
  message: DriveSearchResult<MailConversation>;
  className?: string;
}) => {
  const identity = useDotYouClientContext().getIdentity();
  const sender = message.fileMetadata.senderOdinId || message.fileMetadata.appData.content.sender;

  const messageFromMe = !sender || sender === identity;
  return (
    <div
      data-sender-odin={message.fileMetadata.senderOdinId}
      data-sender={message.fileMetadata.appData.content.sender}
      key={message.fileId}
      className={`flex gap-4 ${messageFromMe ? 'flex-row-reverse' : 'flex-row'} ${className || ''}`}
    >
      {messageFromMe ? null : <ConnectionImage className="h-10 w-10" odinId={sender} />}
      <div className="w-full max-w-[75vw] rounded-lg bg-page-background px-2 py-2 md:max-w-lg">
        <div className={`flex flex-row gap-2`}>
          <p className="font-semibold">
            {messageFromMe ? t('Me') : <ConnectionName odinId={sender} />}
          </p>
          <p>
            {message.fileMetadata.created &&
              formatToTimeAgoWithRelativeDetail(new Date(message.fileMetadata.created), true)}
          </p>
        </div>
        <RichTextRenderer body={message.fileMetadata.appData.content.message} />
      </div>
    </div>
  );
};
