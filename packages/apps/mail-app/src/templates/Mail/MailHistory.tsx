import { DEFAULT_PAYLOAD_KEY, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailDeliveryStatus,
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
  highlightQuery,
  MAIL_ROOT_PATH,
} from '@homebase-id/common-app';
import { ChevronDown, Exclamation } from '@homebase-id/common-app/icons';
import { useEffect, useRef, useState } from 'react';
import { useMarkMailConversationsAsRead } from '../../hooks/mail/useMarkMailConversationsAsRead';
import { useOdinClientContext } from '@homebase-id/common-app';
import { MailConversationInfo } from './MailConversationInfo';
import { useNavigate } from 'react-router-dom';
import { MailAttachmentOverview } from './MailAttachmentOverview';
import { useSearchParams, useParams } from 'react-router-dom';

const DEFAULT_SIZE = 250;
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
  mailThread: HomebaseFile<MailConversation>[];
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
    // Custom scroll handler to support inverted rendering
    observeElementOffset: (instance, cb) => {
      const element = instance.scrollElement;
      if (!element) return;

      const createHandler = (isScrolling: boolean) => () => {
        // Math.abs as the element.scrollTop will be negative with the flex-col-reverse container
        cb(Math.abs(element.scrollTop), isScrolling);
      };

      // Start scroll is always 0, as the flex-col-reverse contents start at the bottom
      cb(0, false);

      const handler = createHandler(true);
      const endHandler = createHandler(false);
      element.addEventListener('scroll', handler, {
        passive: true,
      });
      element.addEventListener('scrollend', endHandler, {
        passive: true,
      });

      return () => {
        element.removeEventListener('scroll', handler);
        element.removeEventListener('scrollend', endHandler);
      };
    },
    initialOffset: 0,
    overscan: 5,
    getItemKey: (index) => mailThread[index]?.fileId || `loader-${index}`,
    scrollToFn: (offset, { adjustments, behavior }, instance) => {
      const toOffest = (offset + (adjustments || 0)) * -1;

      instance.scrollElement?.scrollTo({ top: toOffest, behavior });
      setTimeout(() => instance.scrollElement?.scrollTo({ top: toOffest, behavior }), 0);
    },
  });

  const items = virtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = virtualizer.getVirtualItems();

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
          className="absolute bottom-0 left-0 flex h-full w-full flex-col justify-end px-2 md:px-5"
          style={{
            transform: `translateY(-${items[0]?.start ?? 0}px)`,
          }}
        >
          {items.reverse().map((virtualRow) => {
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
              virtualRow.index === mailThread.length - 1
                ? undefined
                : mailThread[virtualRow.index + 1];
            const message = mailThread[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                data-fileid={message.fileId}
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
  forceAsRead,
  className,
}: {
  previousMessage: HomebaseFile<MailConversation> | undefined;
  message: HomebaseFile<MailConversation>;
  forceAsRead?: boolean;
  className?: string;
}) => {
  const { filter, conversationKey, messageKey } = useParams();
  const isActive = messageKey === message.fileId;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showMessageInfo = isActive && searchParams.has('message-info');
  const query = searchParams.get('q');

  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const sender = message.fileMetadata.senderOdinId || message.fileMetadata.appData.content.sender;

  const messageFromMe = !sender || sender === loggedOnIdentity;
  const isDraft = message.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE;

  return (
    <div key={message.fileId} className={`${isDraft ? 'opacity-60' : ''}`}>
      <ForwardedThread mailThread={message.fileMetadata.appData.content.forwardedMailThread} />
      <ConversationalAwareness previousMessage={previousMessage} message={message} query={query} />
      <div
        className={`flex gap-4 py-1 ${messageFromMe ? 'flex-row-reverse' : 'flex-row'} ${className || ''}`}
      >
        {messageFromMe ? null : (
          <div className="h-10 w-10">
            <ConnectionImage className="h-10 w-10" odinId={sender} />
          </div>
        )}
        <div
          className={`group relative w-full max-w-[75vw] rounded-lg px-2 py-2 sm:max-w-sm lg:max-w-lg xl:max-w-[50vw] ${
            messageFromMe
              ? 'bg-primary/10 dark:bg-primary/30'
              : 'bg-gray-500/10 dark:bg-gray-300/20'
          } ${isDraft ? 'cursor-pointer' : ''} ${isActive ? 'outline outline-4 outline-primary/50' : ''}`}
          onClick={
            isDraft && message.fileId
              ? () => {
                  navigate(`?draft=${message.fileId}`);
                }
              : undefined
          }
        >
          <div className={`flex flex-row gap-2 overflow-hidden`}>
            {!message.fileMetadata.appData.content.isRead && !messageFromMe && !forceAsRead ? (
              <span className="my-auto block h-2 w-2 rounded-full bg-primary" />
            ) : null}
            {messageFromMe &&
            message.fileMetadata.appData.content.deliveryStatus === MailDeliveryStatus.Failed ? (
              <>
                <Exclamation className="my-auto h-5 w-5 text-red-500" />
              </>
            ) : null}
            <p className="font-semibold">
              {messageFromMe ? t('Me') : <ConnectionName odinId={sender} />}
            </p>
            {isDraft ? <p>{t('Draft')}</p> : null}
            <div
              className={`ml-auto flex flex-row items-center gap-2 ${`transition-transform md:translate-x-7 md:group-hover:translate-x-0`}`}
            >
              <p className="select-none text-sm text-foreground/70">
                {message.fileMetadata.created &&
                  formatToTimeAgoWithRelativeDetail(new Date(message.fileMetadata.created), true)}
              </p>
              <ActionGroup
                options={[
                  {
                    label: t('Message info'),
                    onClick: () =>
                      navigate(
                        `${MAIL_ROOT_PATH}/${filter}/${conversationKey}/${message.fileId}?message-info`
                      ),
                  },
                ]}
                className="my-auto flex-shrink-0 rounded-md bg-background p-1"
                type={'mute'}
                size="none"
                alwaysInPortal={true}
              >
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only ml-1">{t('More')}</span>
              </ActionGroup>
            </div>
          </div>
          <RichTextRenderer
            body={message.fileMetadata.appData.content.message}
            options={{
              defaultFileId: message.fileId,
              imageDrive: MailDrive,
              lastModified: message.fileMetadata.updated,
              previewThumbnails: message.fileMetadata.payloads,
              query: query || undefined,
            }}
            className="copyable-content leading-7"
          />
          <MailAttachmentOverview
            className="mt-5"
            files={
              message.fileMetadata.payloads
                ?.filter((pyld) => pyld.key !== DEFAULT_PAYLOAD_KEY)
                ?.map((file) => ({
                  ...file,
                  fileId: message.fileId,
                  conversationId: message.fileMetadata.appData.groupId as string,
                })) || []
            }
            maxVisible={null}
            query={query}
          />
        </div>
      </div>
      {showMessageInfo ? (
        <MailConversationInfo
          mailConversation={message}
          onClose={() => navigate(`${MAIL_ROOT_PATH}/${filter}/${conversationKey}`)}
        />
      ) : null}
    </div>
  );
};

const ForwardedThread = ({
  mailThread,
}: {
  mailThread: HomebaseFile<MailConversation>[] | undefined;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const filteredMailThread = mailThread?.filter(
    (conv) => !getAllRecipients(conv).some((recipient) => recipient === loggedOnIdentity)
  );

  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = filteredMailThread && filteredMailThread?.length > 1;
  if (!hasHistory) return null;

  return (
    <>
      {mailThread && hasHistory ? (
        <>
          {hasHistory && showHistory ? (
            <div className="flex flex-col-reverse">
              {mailThread.map((mail, index) => (
                <MailMessage
                  key={index}
                  previousMessage={undefined}
                  message={mail}
                  forceAsRead={true}
                />
              ))}
            </div>
          ) : null}
          <div className="flex flex-row justify-center py-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="hover:underlin text-sm text-primary"
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
  query,
}: {
  previousMessage: HomebaseFile<MailConversation> | undefined;
  message: HomebaseFile<MailConversation>;
  query: string | undefined | null;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();

  const lastSender =
    message.fileMetadata.senderOdinId || message.fileMetadata.appData.content.sender;
  const youWereLastSender = lastSender === loggedOnIdentity;

  const Author = () => {
    return youWereLastSender ? t('You') : <ConnectionName odinId={lastSender} />;
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-row justify-center py-5">
      <p className="text-sm italic">{children}</p>
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

  const previousRecipients = getAllRecipients(previousMessage, loggedOnIdentity);
  const currentRecipients = getAllRecipients(message, loggedOnIdentity);

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
          <Author /> {t('changed the subject from')} &quot;{highlightQuery(previousSubject, query)}
          &quot; {t('to')} &quot;
          {highlightQuery(currentSubject, query)}&quot;
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
