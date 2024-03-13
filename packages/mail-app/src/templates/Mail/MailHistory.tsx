import { DriveSearchResult, EmbeddedThumb } from '@youfoundation/js-lib/core';
import {
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailDrive,
  getAllRecipients,
} from '../../providers/MailProvider';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ConnectionImage,
  ConnectionName,
  t,
  formatToTimeAgoWithRelativeDetail,
  RichTextRenderer,
  ActionGroup,
  ChevronDown,
} from '@youfoundation/common-app';
import { useEffect, useRef, useState } from 'react';
import { useMarkMailConversationsAsRead } from '../../hooks/mail/useMarkMailConversationsAsRead';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { MailConversationInfo } from './MailConversationInfo';
import { useNavigate } from 'react-router-dom';
import { MailAttachmentOverview } from './MailAttachmentOverview';

const DEFAULT_SIZE = 500;
export const MailHistory = ({
  mailThread,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  autoMarkAsRead = true,
  scrollRef,
  scrollToMessage,

  className,
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  autoMarkAsRead?: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  scrollToMessage?: string;

  className?: string;
}) => {
  const count = mailThread?.length + 1;
  const virtualizer = useVirtualizer({
    getScrollElement: () => scrollRef?.current,
    count,
    estimateSize: () => DEFAULT_SIZE,
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
    getItemKey: (index) => mailThread[index]?.fileId || `loader-${index}`,
    scrollToFn(offset, options, instance) {
      const element = instance.scrollElement;
      if (!element) return;

      const toOffset = (offset + (options.adjustments || 0)) * -1;
      instance.scrollElement?.scrollTo?.({
        [instance.options.horizontal ? 'left' : 'top']: toOffset,
      });
    },
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

  const hasScrolled = useRef<boolean>(false);

  useEffect(() => {
    hasScrolled.current = false;
  }, [scrollToMessage]);

  useEffect(() => {
    const index = mailThread.findIndex((mail) => mail.fileId === scrollToMessage);
    if (index === -1 || hasScrolled.current) return;

    virtualizer.scrollToIndex(index, { align: 'start' });

    if (virtualizer.measurementsCache[index].size === DEFAULT_SIZE) return;
    hasScrolled.current = true;
  }, [scrollToMessage, virtualizer, virtualizer.measurementsCache]);

  useMarkMailConversationsAsRead({ mailThread: autoMarkAsRead ? mailThread : [] });

  return (
    <div className={`flex ${className || ''}`}>
      <div
        className="relative w-full flex-shrink-0 flex-grow-0 overflow-hidden"
        style={{
          height: virtualizer.getTotalSize(),
        }}
      >
        <div
          className="absolute left-0 top-0 flex h-full w-full flex-col-reverse p-2 md:p-5"
          style={{
            transform: `translateY(-${items[0]?.start ?? 0}px)`,
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
                data-fileid={message.fileId}
              >
                <MailMessage
                  previousMessage={previousMessage}
                  message={message}
                  isActive={scrollToMessage ? scrollToMessage === message.fileId : false}
                />
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
  forceAsRead,
  className,
  isActive,
}: {
  previousMessage: DriveSearchResult<MailConversation> | undefined;
  message: DriveSearchResult<MailConversation>;
  forceAsRead?: boolean;
  className?: string;
  isActive: boolean;
}) => {
  const navigate = useNavigate();
  const [showMessageInfo, setShowMessageInfo] = useState(false);

  const identity = useDotYouClientContext().getIdentity();
  const sender = message.fileMetadata.senderOdinId || message.fileMetadata.appData.content.sender;

  const messageFromMe = !sender || sender === identity;
  const isDraft = message.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE;

  return (
    <div key={message.fileId} className={`${isDraft ? 'opacity-60' : ''}`}>
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
          className={`relative w-full max-w-[75vw] rounded-lg px-2 py-2 md:max-w-lg xl:max-w-2xl ${
            messageFromMe ? 'bg-primary/10 dark:bg-primary/30' : 'bg-background'
          } ${isDraft ? 'cursor-pointer' : ''} ${isActive ? 'outline outline-4 outline-primary/50' : ''}`}
          onClick={
            isDraft && message.fileId
              ? () => {
                  navigate(`?draft=${message.fileId}`);
                }
              : undefined
          }
        >
          <div className={`flex flex-row gap-2`}>
            {!message.fileMetadata.appData.content.isRead && !messageFromMe && !forceAsRead ? (
              <span className="my-auto block h-2 w-2 rounded-full bg-primary" />
            ) : null}
            <p className="font-semibold">
              {messageFromMe ? t('Me') : <ConnectionName odinId={sender} />}
            </p>
            {isDraft ? <p>{t('Draft')}</p> : null}
            <p className="ml-auto select-none text-sm text-foreground/70">
              {message.fileMetadata.created &&
                formatToTimeAgoWithRelativeDetail(new Date(message.fileMetadata.created), true)}
            </p>
          </div>
          <RichTextRenderer
            body={message.fileMetadata.appData.content.message}
            options={{
              defaultFileId: message.fileId,
              imageDrive: MailDrive,
              lastModified: message.fileMetadata.updated,
              previewThumbnails: message.fileMetadata.payloads,
            }}
          />
          <MailAttachmentOverview
            className="mt-5"
            files={message.fileMetadata.payloads?.map((file) => ({
              ...file,
              fileId: message.fileId,
              conversationId: message.fileMetadata.appData.groupId as string,
            }))}
            maxVisible={null}
          />

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
  const identity = useDotYouClientContext().getIdentity();
  const filteredMailThread = mailThread?.filter(
    (conv) => !getAllRecipients(conv).some((recipient) => recipient === identity)
  );

  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = filteredMailThread && filteredMailThread?.length > 1;
  if (!hasHistory) return null;

  return (
    <>
      {mailThread && hasHistory ? (
        <>
          {hasHistory && showHistory ? (
            <div className="">
              {mailThread.map((mail, index) => (
                <MailMessage
                  key={index}
                  previousMessage={undefined}
                  message={mail}
                  forceAsRead={true}
                  isActive={false}
                />
              ))}
            </div>
          ) : null}
          <div className="flex flex-row justify-center py-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="hover:underlin text-sm  text-primary"
            >
              {showHistory ? t('Hide history') : t('Show history')}
            </button>
          </div>
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

  const isDraft = message.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE;
  if (isDraft) return null;

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
