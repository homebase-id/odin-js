import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MailHomeHeader } from '../../components/Header/Header';
import { useMailThread } from '../../hooks/mail/useMailThread';
import { ApiType, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ARCHIVE_ARCHIVAL_STATUS,
  MailConversation,
  REMOVE_ARCHIVAL_STATUS,
  getAllRecipients,
} from '../../providers/MailProvider';
import { useMailConversation, useMailDraft } from '../../hooks/mail/useMailConversation';
import {
  ActionButton,
  ActionGroup,
  ActionLink,
  ErrorNotification,
  flattenInfinteData,
  highlightQuery,
  MAIL_ROOT_PATH,
  t,
  useDotYouClientContext,
  useIsConnected,
} from '@homebase-id/common-app';
import { MailHistory } from './MailHistory';
import { MailThreadInfo } from './MailThreadInfo';
import { MailComposer } from '../../components/Composer/MailComposer';
import { useSearchParams } from 'react-router-dom';
import { MailAttachmentsInfo } from './MailAttachmentsInfo';
import { MailAttachmentPreview } from '../../components/Thread/MailAttachmentPreview';
import {
  ReplyArrow,
  Share,
  ArrowLeft,
  Trash,
  Archive,
  PaperClip,
} from '@homebase-id/common-app/icons';

const PAGE_SIZE = 100;
export const MailThread = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const { conversationKey, messageKey, payloadKey } = useParams();
  const previewAttachment = !!messageKey && !!payloadKey;

  const [isDisabledMarkAsRead, setIsDisabledMarkAsRead] = useState(false);

  const {
    data: messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMailThread({ threadId: conversationKey }).fetch;
  // Flatten all pages, sorted descending and slice on the max number expected
  const mailThread = useMemo(
    () =>
      flattenInfinteData<HomebaseFile<MailConversation>>(
        messages,
        hasNextPage ? PAGE_SIZE : undefined,
        (a, b) =>
          (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
          (a.fileMetadata.appData.userDate || a.fileMetadata.created)
      ),
    [messages]
  );

  const { subject, threadId, originId, recipients } = useMemo(() => {
    const lastMessage = mailThread?.[0];
    const allRecipients = getAllRecipients(lastMessage, loggedOnIdentity);

    return {
      ...lastMessage?.fileMetadata.appData.content,
      threadId:
        lastMessage?.fileMetadata.appData.groupId ||
        lastMessage?.fileMetadata.appData.content.threadId,
      recipients: allRecipients,
    };
  }, [mailThread]);

  useEffect(() => {
    if (!headerRef.current) return;

    const resizeObserver = new ResizeObserver(() =>
      setHeaderHeight(headerRef.current?.clientHeight || 0)
    );

    resizeObserver.observe(headerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="flex h-full max-h-[100vh] flex-col-reverse overflow-auto" ref={scrollRef}>
      <div className="absolute left-0 right-0 top-0 z-20" ref={headerRef}>
        <MailHomeHeader className="hidden md:block" />
        <MailThreadHeader
          mailThread={mailThread}
          subject={subject}
          onMarkAsUnread={() => setIsDisabledMarkAsRead(true)}
          className="px-2 md:px-5"
        />
        <MailConnectedState recipients={recipients} />
      </div>

      <section className="flex flex-grow flex-col">
        {/* No loading state as the mailThread should always be there, only when all local data is gone, and you directly open a conversation, you might see a flash of nothing */}
        <MailHistory
          scrollRef={scrollRef}
          mailThread={mailThread || []}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          autoMarkAsRead={isDisabledMarkAsRead ? false : undefined}
          className="max-h-full bg-background py-2 md:py-5"
          scrollToMessage={messageKey}
        />
        <MailThreadActions
          className="flex-grow bg-background p-2 md:p-5"
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
  mailThread: HomebaseFile<MailConversation>[];
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
    <div className={`relative border-t border-gray-100 dark:border-gray-800 ${className || ''}`}>
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

  mailThread: HomebaseFile<MailConversation>[];
  recipients: string[];
  originId: string;
  threadId: string;
  subject: string;
  onDone: () => void;
}) => {
  const hasDraft = !!draftFileId;
  const { data: draftDsr } = useMailDraft(hasDraft ? { draftFileId } : undefined).getDraft;

  return hasDraft && !draftDsr ? null : (
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
  mailThread: HomebaseFile<MailConversation>[];
  onDone: () => void;
}) => {
  return (
    <MailComposer
      originId={originId}
      subject={subject}
      onDone={onDone}
      forwardedMailThread={mailThread}
    />
  );
};

const MailThreadHeader = ({
  mailThread,
  subject,
  onMarkAsUnread,
  className,
}: {
  mailThread: HomebaseFile<MailConversation>[];
  subject: string | undefined;
  onMarkAsUnread: () => void;
  className?: string;
}) => {
  const { filter } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const showMailThreadInfo = searchParams.has('info');
  const showAttachmentsInfo = searchParams.has('attachments');
  const query = searchParams.get('q');

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
        className={`sticky top-[3.7rem] z-20 flex flex-col border-b border-gray-100 bg-background p-2 dark:border-gray-800 sm:flex-row sm:items-center sm:gap-5 ${className || ''}`}
      >
        <div className="flex flex-row gap-2 sm:contents">
          <div className="order-1 flex flex-row gap-2">
            <ActionButton
              onClick={() =>
                navigate({
                  pathname: `${MAIL_ROOT_PATH}/${filter}`,
                  search: window.location.search,
                })
              }
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
          </div>

          <div className="order-3 ml-auto flex flex-row items-center gap-2">
            <ActionButton
              onClick={() => navigate('?attachments')}
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
                  onClick: () => navigate('?info'),
                },
                {
                  label: t('Mark as unread'),
                  onClick: doMarkAsUnread,
                },
              ]}
            />
          </div>
        </div>

        <h1 className="order-2 mt-3 text-xl sm:mt-0">{highlightQuery(subject, query)}</h1>
      </div>
      {showMailThreadInfo && mailThread.length >= 1 ? (
        <MailThreadInfo mailThread={mailThread} onClose={() => navigate('?')} />
      ) : null}
      {showAttachmentsInfo && mailThread.length >= 1 ? (
        <MailAttachmentsInfo mailThread={mailThread} onClose={() => navigate('?')} />
      ) : null}
    </>
  );
};

const MailConnectedState = ({ recipients }: { recipients: string[] }) => {
  if (!recipients || recipients.length <= 1) return null;

  return (
    <div className="border-t empty:hidden dark:border-t-slate-800">
      {recipients.map((recipient) => {
        return <RecipientConnectedState recipient={recipient} key={recipient} />;
      })}
    </div>
  );
};

const RecipientConnectedState = ({ recipient }: { recipient: string }) => {
  const { data: isConnected, isFetched } = useIsConnected(recipient);
  const host = useDotYouClientContext().getRoot();

  if (isConnected || !isFetched) return null;
  return (
    <div className="flex w-full flex-row items-center justify-between bg-background px-5 py-2">
      <p>
        {t('You can only chat with connected identities, messages will not be delivered to')}:{' '}
        <a
          href={new DotYouClient({ hostIdentity: recipient, api: ApiType.Guest }).getRoot()}
          className="underline"
        >
          {recipient}
        </a>
      </p>
      <ActionLink href={`${host}/owner/connections/${recipient}/connect`}>
        {t('Connect')}
      </ActionLink>
    </div>
  );
};
