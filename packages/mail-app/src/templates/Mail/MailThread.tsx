import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MailHomeHeader } from '../../components/Header/Header';
import { useMailThread } from '../../hooks/mail/useMailThread';
import {
  ActionButton,
  ActionGroup,
  Archive,
  ArrowLeft,
  ErrorNotification,
  LoadingBlock,
  PaperClip,
  ReplyArrow,
  Share,
  Trash,
  flattenInfinteData,
  t,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  ARCHIVE_ARCHIVAL_STATUS,
  MailConversation,
  REMOVE_ARCHIVAL_STATUS,
  getAllRecipients,
} from '../../providers/MailProvider';
import { useMailConversation, useMailDraft } from '../../hooks/mail/useMailConversation';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { MailHistory } from './MailHistory';
import { MailThreadInfo } from './MailThreadInfo';
import { MailComposer } from '../../components/Composer/MailComposer';
import { useSearchParams } from 'react-router-dom';
import { MailAttachmentsInfo } from './MailAttachmentsInfo';
import { MailAttachmentPreview } from '../../components/Thread/MailAttachmentPreview';

const PAGE_SIZE = 100;
export const MailThread = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const identity = useDotYouClientContext().getIdentity();
  const { conversationKey, messageKey, payloadKey } = useParams();
  const previewAttachment = !!messageKey && !!payloadKey;

  const [isDisabledMarkAsRead, setIsDisabledMarkAsRead] = useState(false);

  const {
    data: messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useMailThread({ threadId: conversationKey }).fetch;

  // Flatten all pages, sorted descending and slice on the max number expected
  const mailThread = useMemo(
    () =>
      flattenInfinteData<DriveSearchResult<MailConversation>>(
        messages,
        PAGE_SIZE,
        (a, b) =>
          (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
          (a.fileMetadata.appData.userDate || a.fileMetadata.created)
      ),
    [messages]
  );

  const { subject, threadId, originId, recipients } = useMemo(() => {
    const lastMessage = mailThread?.[mailThread.length - 1];
    const allRecipients = getAllRecipients(lastMessage, identity);

    return {
      ...lastMessage?.fileMetadata.appData.content,
      threadId:
        lastMessage?.fileMetadata.appData.groupId ||
        lastMessage?.fileMetadata.appData.content.threadId,
      recipients: allRecipients,
    };
  }, [mailThread]);

  useEffect(() => {
    const resizeHandler = () => setHeaderHeight(headerRef.current?.clientHeight || 0);
    window.addEventListener('resize', resizeHandler);

    resizeHandler();
    return () => window.removeEventListener('resize', resizeHandler);
  }, []);

  return (
    <div className="flex h-full max-h-[100vh] flex-col-reverse overflow-auto" ref={scrollRef}>
      <div className="absolute left-0 right-0 top-0 z-20" ref={headerRef}>
        <MailHomeHeader />
        <MailThreadHeader
          mailThread={mailThread}
          subject={subject}
          onMarkAsUnread={() => setIsDisabledMarkAsRead(true)}
          className="px-2 md:px-5"
        />
      </div>

      <section className="flex flex-grow flex-col">
        {isFetching ? (
          <div className="flex flex-grow flex-col gap-4 p-2 md:p-5">
            <LoadingBlock className="h-32 w-full bg-background" />
            <LoadingBlock className="h-32 w-full bg-background" />
            <LoadingBlock className="h-32 w-full bg-background" />
            <LoadingBlock className="h-32 w-full bg-background" />
            <LoadingBlock className="h-32 w-full bg-background" />
          </div>
        ) : (
          <MailHistory
            scrollRef={scrollRef}
            mailThread={mailThread}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            autoMarkAsRead={isDisabledMarkAsRead ? false : undefined}
            className="h-full bg-page-background py-2 md:py-5"
            scrollToMessage={messageKey}
          />
        )}
        <MailThreadActions
          className="bg-background px-2 md:px-5"
          mailThread={mailThread}
          originId={originId}
          threadId={threadId}
          recipients={recipients}
          subject={subject}
        />
      </section>

      {/* This adds the necessary space for the absolute position header;
          We can't do a regular sticky as it's a col-reverse container */}
      <div style={{ height: `${headerHeight}px`, width: '20px' }} className="flex-shrink-0" />
      {previewAttachment ? (
        <MailAttachmentPreview messageId={messageKey} payloadKey={payloadKey} />
      ) : null}
    </div>
  );
};
const MailThreadActions = ({
  mailThread,
  className,
  ...threadProps
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  className?: string;
  recipients: string[];
  originId: string;
  threadId: string;
  subject: string;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const draftFileId = searchParams.get('draft');

  const [isReply, setIsReply] = useState(!!draftFileId);
  const [isForward, setIsForward] = useState(false);

  useEffect(() => {
    if (draftFileId) setIsReply(true);
  }, [draftFileId]);

  return (
    <div className={`border-t border-gray-100 py-2 dark:border-gray-800  ${className || ''}`}>
      {isReply ? (
        <ReplyAction
          {...threadProps}
          draftFileId={draftFileId || undefined}
          mailThread={mailThread}
          onDone={() => {
            setIsReply(false);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('draft');
            setSearchParams(newSearchParams);
          }}
        />
      ) : isForward ? (
        <ForwardAction
          subject={threadProps.subject}
          originId={threadProps.originId}
          mailThread={mailThread}
          onDone={() => setIsForward(false)}
        />
      ) : (
        <div className="flex flex-row gap-2">
          <ActionButton type="secondary" icon={ReplyArrow} onClick={() => setIsReply(!isReply)}>
            {t('Reply')}
          </ActionButton>
          <ActionButton type="secondary" icon={Share} onClick={() => setIsForward(!isForward)}>
            {t('Forward')}
          </ActionButton>
        </div>
      )}
    </div>
  );
};

const ReplyAction = ({
  draftFileId,

  mailThread,
  recipients,
  originId,
  threadId,
  subject,
  onDone,
}: {
  draftFileId: string | undefined;

  mailThread: DriveSearchResult<MailConversation>[];
  recipients: string[];
  originId: string;
  threadId: string;
  subject: string;
  onDone: () => void;
}) => {
  const hasDraft = !!draftFileId;
  const { data: draftDsr } = useMailDraft(hasDraft ? { draftFileId } : undefined).getDraft;

  return (
    <div className="rounded-lg px-2 py-5 md:px-5">
      {hasDraft && !draftDsr ? null : (
        <MailComposer
          existingDraft={draftDsr || undefined}
          recipients={recipients}
          originId={originId}
          threadId={threadId}
          subject={subject}
          onDone={onDone}
          // We want to re-render when the versionTag changes.. So the latest updates are effectively rendered
          key={`${draftFileId}${draftDsr?.fileMetadata.versionTag}`}
          forwardedMailThread={mailThread}
        />
      )}
    </div>
  );
};

const ForwardAction = ({
  originId,
  subject,
  mailThread,
  onDone,
}: {
  originId: string;
  subject: string;
  mailThread: DriveSearchResult<MailConversation>[];
  onDone: () => void;
}) => {
  return (
    <div className="rounded-lg px-2 py-5 md:px-5">
      <MailComposer
        originId={originId}
        subject={subject}
        onDone={onDone}
        forwardedMailThread={mailThread}
      />
    </div>
  );
};

const MailThreadHeader = ({
  mailThread,
  subject,
  onMarkAsUnread,
  className,
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  subject: string | undefined;
  onMarkAsUnread: () => void;
  className?: string;
}) => {
  const [showMailThreadInfo, setShowMailThreadInfo] = useState(false);
  const [showAttachmentsInfo, setShowAttachmentsInfo] = useState(false);

  const {
    mutate: removeThread,
    status: removeThreadStatus,
    error: removeThreadError,
  } = useMailThread().remove;
  const {
    mutate: archiveThread,
    status: archiveThreadStatus,
    error: archiveThreadError,
  } = useMailThread().archive;
  const {
    mutate: restoreThread,
    status: restoreThreadStatus,
    error: restoreThreadError,
  } = useMailThread().restore;
  const { mutate: markAsUnRead } = useMailConversation().markAsUnread;

  const doArchive = () => archiveThread(mailThread);
  const doRemove = () => removeThread(mailThread);
  const doRestore = () => restoreThread(mailThread);
  const doMarkAsUnread = () => {
    markAsUnRead({
      mailConversations: mailThread,
    });
    onMarkAsUnread();
  };

  const isArchived = mailThread.some(
    (m) => m.fileMetadata.appData.archivalStatus === ARCHIVE_ARCHIVAL_STATUS
  );
  const isTrash = mailThread.some(
    (m) => m.fileMetadata.appData.archivalStatus === REMOVE_ARCHIVAL_STATUS
  );

  return (
    <>
      <ErrorNotification error={restoreThreadError || removeThreadError || archiveThreadError} />
      <div
        className={`sticky top-[3.7rem] z-20 flex flex-row items-center border-b border-gray-100 bg-background p-2 dark:border-gray-800 ${className || ''}`}
      >
        <ActionButton
          onClick={() => window.history.back()}
          icon={ArrowLeft}
          type="mute"
          size="none"
          className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
        />
        {isArchived || isTrash ? (
          <ActionButton
            type="mute"
            className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
            size="none"
            onClick={doRestore}
            state={restoreThreadStatus !== 'success' ? restoreThreadStatus : undefined}
          >
            {t('Restore')}
          </ActionButton>
        ) : (
          <>
            <ActionButton
              type="mute"
              className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
              size="none"
              icon={Trash}
              state={removeThreadStatus}
              confirmOptions={{
                title: t('Delete conversation'),
                body: t('Are you sure you want to delete the conversation?'),
                buttonText: t('Delete'),
              }}
              onClick={doRemove}
            />
            <ActionButton
              type="mute"
              className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
              size="none"
              icon={Archive}
              state={archiveThreadStatus}
              onClick={doArchive}
            />
          </>
        )}
        <h1 className="ml-3 text-xl">{subject}</h1>
        <div className="ml-auto flex flex-row items-center">
          <ActionButton
            onClick={() => setShowAttachmentsInfo(true)}
            icon={PaperClip}
            type="mute"
            size="none"
            className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
          />
          <ActionGroup
            className="ml-auto"
            type={'mute'}
            size="square"
            options={[
              {
                label: t('Thread info'),
                onClick: () => setShowMailThreadInfo(true),
              },
              {
                label: t('Mark as unread'),
                onClick: doMarkAsUnread,
              },
            ]}
          />
        </div>
      </div>
      {showMailThreadInfo ? (
        <MailThreadInfo mailThread={mailThread} onClose={() => setShowMailThreadInfo(false)} />
      ) : null}
      {showAttachmentsInfo ? (
        <MailAttachmentsInfo
          mailThread={mailThread}
          onClose={() => setShowAttachmentsInfo(false)}
        />
      ) : null}
    </>
  );
};