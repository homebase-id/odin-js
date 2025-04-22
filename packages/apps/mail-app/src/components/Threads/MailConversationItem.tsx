import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import {
  ARCHIVE_ARCHIVAL_STATUS,
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  REMOVE_ARCHIVAL_STATUS,
} from '../../providers/MailProvider';
import { DEFAULT_PAYLOAD_KEY, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ActionButton,
  Checkbox,
  ErrorNotification,
  formatToTimeAgoWithRelativeDetail,
  highlightQuery,
  MAIL_ROOT_PATH,
  t,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { MailAttachmentOverview } from '../../templates/Mail/MailAttachmentOverview';
import { RecipientsList } from './RecipientsList';
import { useMailThread } from '../../hooks/mail/useMailThread';
import { useMailConversation } from '../../hooks/mail/useMailConversation';
import { Trash, Archive, Envelope, EnvelopeOpen } from '@homebase-id/common-app/icons';

export const MailConversationItem = ({
  mailThread,
  toggleSelection,
  isSelected,
  pathPrefix,
  query,
}: {
  mailThread: HomebaseFile<MailConversation>[];
  toggleSelection: () => void;
  isSelected: boolean;
  pathPrefix?: string;
  query?: string;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();

  const lastConversation = mailThread[0];
  const lastReceivedConversation = mailThread.find(
    (conv) =>
      (conv.fileMetadata.senderOdinId || conv.fileMetadata.appData.content.sender) !==
      loggedOnIdentity
  );

  const threadId = lastConversation.fileMetadata.appData.groupId as string;

  const isUnread =
    lastReceivedConversation && !lastReceivedConversation.fileMetadata.appData.content.isRead;
  const isDraft =
    lastConversation.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE;
  const isTrash = lastConversation.fileMetadata.appData.archivalStatus === REMOVE_ARCHIVAL_STATUS;
  const isArchived =
    lastConversation.fileMetadata.appData.archivalStatus === ARCHIVE_ARCHIVAL_STATUS;

  const subject = useMemo(
    () => highlightQuery(lastConversation.fileMetadata.appData.content.subject, query),
    [query, lastConversation]
  );

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
    markAsRead: { mutate: markAsRead, status: markAsReadStatus, error: markAsReadError },
    markAsUnread: { mutate: markAsUnread, status: markAsUnreadStatus, error: markAsUnreadError },
  } = useMailConversation();

  const doArchive: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    archiveThread(mailThread);
  };
  const doRemove: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    removeThread(mailThread);
  };
  const doMarkAsRead: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    markAsRead({ mailConversations: [lastReceivedConversation || lastConversation] });
  };
  const doMarkAsUnread: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    markAsUnread({ mailConversations: [lastReceivedConversation || lastConversation] });
  };

  const quickActionsClassName = 'hover:bg-primary/20 dark:hover:bg-primary/50 px-2 py-1 rounded-md';

  return (
    <>
      <ErrorNotification
        error={removeThreadError || archiveThreadError || markAsReadError || markAsUnreadError}
      />
      <Link
        to={{
          pathname: isDraft
            ? `${MAIL_ROOT_PATH}/new/${lastConversation.fileId}`
            : `${pathPrefix || ''}${threadId}`,
          search: window.location.search,
        }}
      >
        <div
          className={`relative flex flex-col gap-2 border-t border-t-slate-100 p-4 py-3 transition-colors group-first-of-type:border-0 dark:border-t-slate-700 ${isSelected ? 'bg-primary/20 dark:bg-primary/50' : ''} ${!isSelected ? `group-hover:bg-slate-50 dark:group-hover:bg-slate-800 ${isUnread ? 'bg-slate-50 dark:bg-slate-700' : 'bg-background dark:bg-background'}` : ''}`}
        >
          <div className={`flex flex-row items-center justify-between gap-4 md:gap-8`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleSelection();
              }}
              className="absolute bottom-0 left-0 top-0 z-10 w-10"
            />
            <Checkbox checked={isSelected} readOnly id={'select-' + lastConversation.fileId} />
            <div className={`${isUnread ? 'font-semibold' : ''} flex flex-col md:contents`}>
              <div className="flex w-28 flex-shrink-0 flex-row gap-1">
                {isUnread ? (
                  <span className="my-auto block h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                ) : null}
                <RecipientsList mailThread={mailThread} />
              </div>
              <div className="flex flex-grow flex-col gap-2">
                <div className="flex w-full flex-row items-center">
                  <p
                    className={`flex-grow font-normal text-foreground/60 ${isUnread ? 'md:font-semibold' : ''} md:text-inherit`}
                  >
                    {subject}
                  </p>
                  <div className="ml-auto hidden flex-row items-center opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                    <ActionButton
                      type="mute"
                      icon={Trash}
                      onClick={doRemove}
                      state={removeThreadStatus == 'success' ? undefined : removeThreadStatus}
                      disabled={isTrash}
                      title={t('Remove')}
                      className={quickActionsClassName}
                      size="none"
                    />
                    <ActionButton
                      type="mute"
                      icon={Archive}
                      onClick={doArchive}
                      state={archiveThreadStatus == 'success' ? undefined : archiveThreadStatus}
                      disabled={isArchived}
                      title={t('Archive')}
                      className={quickActionsClassName}
                      size="none"
                    />
                    {isUnread ? (
                      <ActionButton
                        type="mute"
                        icon={EnvelopeOpen}
                        onClick={doMarkAsRead}
                        state={markAsReadStatus == 'success' ? undefined : markAsReadStatus}
                        title={t('Mark as read')}
                        className={quickActionsClassName}
                        size="none"
                      />
                    ) : (
                      <ActionButton
                        type="mute"
                        icon={Envelope}
                        onClick={doMarkAsUnread}
                        state={markAsUnreadStatus == 'success' ? undefined : markAsUnreadStatus}
                        title={t('Mark as unread')}
                        className={quickActionsClassName}
                        size="none"
                      />
                    )}
                  </div>
                </div>
                <MailAttachmentOverview
                  query={query}
                  files={mailThread.flatMap((thread) =>
                    (thread.fileMetadata.payloads || [])
                      .filter((pyld) => pyld.key !== DEFAULT_PAYLOAD_KEY)
                      .map((file) => ({
                        ...file,
                        fileId: thread.fileId,
                        conversationId: thread.fileMetadata.appData.groupId as string,
                      }))
                  )}
                />
              </div>
            </div>
            <p className="ml-auto text-sm text-foreground/50">
              {formatToTimeAgoWithRelativeDetail(
                new Date(lastConversation.fileMetadata.created),
                true
              )}
            </p>
          </div>
        </div>
      </Link>
    </>
  );
};
