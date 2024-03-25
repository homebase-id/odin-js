import {
  formatToTimeAgoWithRelativeDetail,
  Checkbox,
  highlightQuery,
} from '@youfoundation/common-app';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { MAIL_DRAFT_CONVERSATION_FILE_TYPE, MailConversation } from '../../providers/MailProvider';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { ROOT_PATH } from '../../app/App';
import { MailAttachmentOverview } from '../../templates/Mail/MailAttachmentOverview';
import { RecipientsList } from './RecipientsList';

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
  const identity = useDotYouClientContext().getIdentity();

  const lastConversation = mailThread[0];
  const lastReceivedConversation = mailThread.find(
    (conv) =>
      (conv.fileMetadata.senderOdinId || conv.fileMetadata.appData.content.sender) !== identity
  );

  const threadId = lastConversation.fileMetadata.appData.groupId as string;

  const isUnread =
    lastReceivedConversation && !lastReceivedConversation.fileMetadata.appData.content.isRead;
  const isDraft =
    lastConversation.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE;

  const subject = useMemo(
    () => highlightQuery(lastConversation.fileMetadata.appData.content.subject, query),
    [query, lastConversation]
  );

  return (
    <Link
      to={{
        pathname: isDraft
          ? `${ROOT_PATH}/new/${lastConversation.fileId}`
          : `${pathPrefix || ''}${threadId}`,
        search: window.location.search,
      }}
      className="group"
    >
      <div
        className={`relative flex flex-col gap-2 border-b border-b-slate-100 p-4 py-3 transition-colors group-last-of-type:border-0 dark:border-b-slate-700
            ${isSelected ? 'bg-primary/10' : ''}
            ${!isSelected ? `group-hover:bg-white dark:group-hover:bg-black ${isUnread ? 'bg-white dark:bg-black' : 'border-b-slate-200 bg-slate-50 dark:bg-slate-900'}` : ''}`}
      >
        <div className={`flex flex-row justify-between gap-4 md:gap-8`}>
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
            <div className="flex flex-col gap-2">
              <p
                className={`font-normal text-foreground/60 ${isUnread ? 'md:font-semibold' : ''} md:text-inherit`}
              >
                {subject}
              </p>
              <MailAttachmentOverview
                files={lastConversation.fileMetadata.payloads?.map((file) => ({
                  ...file,
                  fileId: lastConversation.fileId,
                  conversationId: lastConversation.fileMetadata.appData.groupId as string,
                }))}
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
  );
};
