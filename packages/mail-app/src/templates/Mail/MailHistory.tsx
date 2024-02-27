import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { MailConversation, getAllRecipients } from '../../providers/MailProvider';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  ConnectionImage,
  ConnectionName,
  t,
  formatToTimeAgoWithRelativeDetail,
  RichTextRenderer,
  ActionGroup,
  ChevronDown,
} from '@youfoundation/common-app';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMarkMailConversationsAsRead } from '../../hooks/mail/useMarkMailConversationsAsRead';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { MailConversationInfo } from './MailConversationInfo';

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

            const previousMessage =
              virtualRow.index === 0 ? undefined : mailThread[virtualRow.index - 1];
            const message = mailThread[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
              >
                <MailMessage previousMessage={previousMessage} message={message} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MailMessage = ({
  previousMessage,
  message,
  className,
}: {
  previousMessage: DriveSearchResult<MailConversation> | undefined;
  message: DriveSearchResult<MailConversation>;
  className?: string;
}) => {
  const [showMessageInfo, setShowMessageInfo] = useState(false);

  const identity = useDotYouClientContext().getIdentity();
  const sender = message.fileMetadata.senderOdinId || message.fileMetadata.appData.content.sender;

  const messageFromMe = !sender || sender === identity;

  return (
    <div key={message.fileId}>
      <ForwardedThread mailThread={message.fileMetadata.appData.content.forwardedMailThread} />
      <ConversationalAwareness previousMessage={previousMessage} message={message} />
      <div
        className={`group flex gap-4 py-1 ${messageFromMe ? 'flex-row-reverse' : 'flex-row'} ${className || ''}`}
      >
        {messageFromMe ? null : (
          <div className="h-10 w-10">
            <ConnectionImage className="h-10 w-10" odinId={sender} />
          </div>
        )}
        <div
          className={`relative w-full max-w-[75vw] rounded-lg px-2 py-2 md:max-w-lg ${
            messageFromMe
              ? 'bg-primary/10 dark:bg-primary/30'
              : 'bg-gray-500/10  dark:bg-gray-300/20'
          }`}
        >
          <div className={`flex flex-row gap-2`}>
            <p className="font-semibold">
              {messageFromMe ? t('Me') : <ConnectionName odinId={sender} />}
            </p>
            <p className="ml-auto select-none text-sm text-foreground/70">
              {message.fileMetadata.created &&
                formatToTimeAgoWithRelativeDetail(new Date(message.fileMetadata.created), true)}
            </p>
          </div>
          <RichTextRenderer body={message.fileMetadata.appData.content.message} />

          <ActionGroup
            options={[
              {
                label: t('Message info'),
                onClick: () => setShowMessageInfo(true),
              },
            ]}
            className="absolute right-1 top-[0.125rem] z-10 rounded-full bg-background/60 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
            type={'mute'}
            size="square"
          >
            <ChevronDown className="h-3 w-3" />
            <span className="sr-only ml-1">{t('More')}</span>
          </ActionGroup>
        </div>
      </div>
      {showMessageInfo ? (
        <MailConversationInfo
          mailConversation={message}
          onClose={() => setShowMessageInfo(false)}
        />
      ) : null}
    </div>
  );
};

const ForwardedThread = ({
  mailThread,
}: {
  mailThread: DriveSearchResult<MailConversation>[] | undefined;
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = mailThread && mailThread?.length > 1;
  if (!hasHistory) return null;

  return (
    <>
      {mailThread && hasHistory ? (
        <>
          <div className="flex flex-row py-2">
            <button onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? t('Hide history') : t('Show history')}
            </button>
          </div>
          {hasHistory && showHistory ? (
            <div className="">
              {mailThread.map((mail, index) => (
                <MailMessage key={index} previousMessage={undefined} message={mail} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
};

const ConversationalAwareness = ({
  previousMessage,
  message,
}: {
  previousMessage: DriveSearchResult<MailConversation> | undefined;
  message: DriveSearchResult<MailConversation>;
}) => {
  const identity = useDotYouClientContext().getIdentity();

  const lastSender =
    message.fileMetadata.senderOdinId || message.fileMetadata.appData.content.sender;
  const youWereLastSender = lastSender === identity;

  const Author = () => {
    return youWereLastSender ? t('You') : <ConnectionName odinId={lastSender} />;
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-row justify-center py-4">
      <p className="rounded-lg bg-page-background px-3 py-1 text-sm italic">{children}</p>
    </div>
  );

  if (!previousMessage) {
    const hasForwardedMailThread =
      message.fileMetadata.appData.content.forwardedMailThread &&
      message.fileMetadata.appData.content.forwardedMailThread?.length;
    if (!hasForwardedMailThread) return null;
    return (
      <Wrapper>
        <Author /> {t('forwarded a message thread')}
      </Wrapper>
    );
  }

  const previousSubject = previousMessage.fileMetadata.appData.content.subject;
  const currentSubject = message.fileMetadata.appData.content.subject;

  const previousRecipients = getAllRecipients(previousMessage, identity);
  const currentRecipients = getAllRecipients(message, identity);

  const addedRecipients = currentRecipients.filter(
    (current) => !previousRecipients.includes(current)
  );
  const removedRecipients = previousRecipients.filter(
    (previous) => !currentRecipients.includes(previous)
  );

  const isSameSubject = previousSubject === currentSubject;
  const isSameRecipients = addedRecipients.length === 0 && removedRecipients.length === 0;

  if (isSameSubject && isSameRecipients) return null;

  return (
    <>
      {!isSameSubject && (
        <Wrapper>
          <Author /> {t('changed the subject from')} &quot;{previousSubject}&quot; {t('to')} &quot;
          {currentSubject}&quot;
        </Wrapper>
      )}
      {addedRecipients.map((recipient) => (
        <Wrapper key={recipient}>
          <Author /> {t('added')} &quot;
          <ConnectionName odinId={recipient} />
          &quot;
        </Wrapper>
      ))}
      {removedRecipients.map((recipient) => (
        <Wrapper key={recipient}>
          <Author /> {t('removed')} &quot;
          <ConnectionName odinId={recipient} />
          &quot;
        </Wrapper>
      ))}
    </>
  );
};
