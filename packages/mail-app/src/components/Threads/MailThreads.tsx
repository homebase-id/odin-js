import {
  formatToTimeAgoWithRelativeDetail,
  Checkbox,
  ActionButton,
  Trash,
  t,
  LoadingBlock,
  ConnectionName,
  ErrorNotification,
  ActionGroup,
} from '@youfoundation/common-app';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { Archive } from '@youfoundation/common-app';
import {
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  getAllRecipients,
} from '../../providers/MailProvider';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { useMailThread } from '../../hooks/mail/useMailThread';
import { ROOT_PATH } from '../../app/App';
import { MailThreadsFilter, useFilteredMailThreads } from '../../hooks/mail/useFilteredMailThreads';
import { useMailConversation } from '../../hooks/mail/useMailConversation';
import React from 'react';

export const MailThreads = ({ filter }: { filter: MailThreadsFilter }) => {
  const [selection, setSelection] = useState<DriveSearchResult<MailConversation>[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const identity = useDotYouClientContext().getIdentity();

  const { hasMorePosts, conversationsLoading, fetchNextPage, isFetchingNextPage, threads } =
    useFilteredMailThreads(filter);

  useEffect(() => {
    if (isAllSelected) setSelection(threads.map((thread) => thread[0]));
    else setSelection([]);
  }, [isAllSelected]);

  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: threads?.length + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 120, // Rough size of a postTeasercard
    scrollMargin: parentOffsetRef.current,
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= threads?.length - 1 && hasMorePosts && !isFetchingNextPage)
      fetchNextPage();
  }, [
    hasMorePosts,
    fetchNextPage,
    threads?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  return (
    <section className="flex flex-grow flex-col md:mx-5 md:my-5">
      <MailConversationsHeader
        selection={selection}
        isAllSelected={isAllSelected}
        toggleAllSelection={() => setIsAllSelected(!isAllSelected)}
      />
      {conversationsLoading ? (
        <div className="flex flex-col gap-2">
          <LoadingBlock className="h-10" />
          <LoadingBlock className="h-10" />
          <LoadingBlock className="h-10" />
        </div>
      ) : threads?.length ? (
        <div className="flex-grow" ref={parentRef}>
          <div
            className="relative w-full"
            style={{
              height: virtualizer.getTotalSize(),
            }}
          >
            <div
              className="absolute left-0 top-0 z-0 w-full"
              style={{
                transform: `translateY(${items[0]?.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {items.map((virtualRow) => {
                const isLoaderRow = virtualRow.index > threads.length - 1;
                if (isLoaderRow) {
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="px-3 py-1"
                    >
                      {hasMorePosts || isFetchingNextPage ? (
                        <div className="animate-pulse" key={'loading'}>
                          {t('Loading...')}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                const mailThread = threads[virtualRow.index];
                const lastConversation =
                  mailThread.find(
                    (conv) =>
                      (conv.fileMetadata.senderOdinId ||
                        conv.fileMetadata.appData.content.sender) !== identity
                  ) || mailThread[0];
                const lastConversationId = lastConversation.fileMetadata.appData.groupId as string;
                const isSelected = selection.some((select) =>
                  stringGuidsEqual(select.fileMetadata.appData.groupId, lastConversationId)
                );

                return (
                  <MailConversationItem
                    key={lastConversation.fileId}
                    data-key={lastConversation.fileId}
                    mailThread={mailThread}
                    pathPrefix={`${ROOT_PATH}/${filter}/`}
                    toggleSelection={() => {
                      setIsAllSelected(false);
                      setSelection(
                        isSelected
                          ? [
                              ...selection.filter(
                                (selected) =>
                                  !stringGuidsEqual(
                                    selected.fileMetadata.appData.groupId,
                                    lastConversationId
                                  )
                              ),
                            ]
                          : [...selection, lastConversation]
                      );
                    }}
                    isSelected={isSelected}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 py-1">
          <div className="italic opacity-50" key={'no-more'}>
            {t('No conversations')}
          </div>
        </div>
      )}
    </section>
  );
};

const MailConversationsHeader = ({
  selection,
  isAllSelected,
  toggleAllSelection,
}: {
  selection: DriveSearchResult<MailConversation>[];
  isAllSelected: boolean;
  toggleAllSelection: () => void;
}) => {
  const hasASelection = selection.length > 0;
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
    markAsRead: { mutate: markAsRead, error: markAsReadError },
    markAsUnread: { mutate: markAsUnread, error: markAsUnreadError },
  } = useMailConversation();

  const doArchive = () => archiveThread(selection);
  const doRemove = () => removeThread(selection);
  const doMarkAsRead = () => markAsRead({ mailConversations: selection });
  const doMarkAsUnread = () => markAsUnread({ mailConversations: selection });

  return (
    <>
      <ErrorNotification
        error={markAsReadError || markAsUnreadError || removeThreadError || archiveThreadError}
      />
      <div className="relative flex flex-row items-center border-b border-b-slate-100 bg-white px-2 py-2 dark:border-b-slate-700 dark:bg-black md:rounded-t-lg">
        <div className="p-2">
          <button
            className="absolute bottom-0 left-0 top-0 z-10 w-10"
            onClick={toggleAllSelection}
          ></button>
          <Checkbox checked={isAllSelected} readOnly className="block" />
        </div>
        {hasASelection ? (
          <>
            <ActionButton
              type="mute"
              className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
              size="none"
              icon={Trash}
              confirmOptions={{
                title: t('Delete {0} selected conversations', selection.length),
                body: t('Are you sure you want to delete the selected conversations?'),
                buttonText: t('Delete'),
              }}
              onClick={doRemove}
              state={removeThreadStatus !== 'success' ? removeThreadStatus : undefined}
            />
            <ActionButton
              type="mute"
              className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
              size="none"
              icon={Archive}
              onClick={doArchive}
              state={archiveThreadStatus !== 'success' ? archiveThreadStatus : undefined}
            />
          </>
        ) : null}

        <ActionGroup
          type="mute"
          size="none"
          className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
          options={[
            {
              label: t('Mark as unread'),
              onClick: doMarkAsUnread,
            },
            {
              label: t('Mark as read'),
              onClick: doMarkAsRead,
            },
          ]}
        />
      </div>
    </>
  );
};

const MailConversationItem = ({
  mailThread,
  toggleSelection,
  isSelected,
  pathPrefix,
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  toggleSelection: () => void;
  isSelected: boolean;
  pathPrefix?: string;
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

  return (
    <Link
      to={
        isDraft ? `${ROOT_PATH}/new/${lastConversation.fileId}` : `${pathPrefix || ''}${threadId}`
      }
      className="group"
    >
      <div
        className={`relative flex flex-col gap-2 border-b border-b-slate-100 p-4 py-3 transition-colors group-last-of-type:border-0 dark:border-b-slate-700
          ${isSelected ? 'bg-primary/10' : ''}
          ${!isSelected ? `group-hover:bg-slate-100 dark:group-hover:bg-slate-900 ${isUnread ? 'bg-white dark:bg-black' : 'border-b-slate-200 bg-slate-50 dark:bg-slate-950'}` : ''}`}
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
          <Checkbox checked={isSelected} readOnly />
          <div className={`${isUnread ? 'font-semibold' : ''} flex flex-col md:contents`}>
            <div className="flex w-28 flex-shrink-0 flex-row gap-1">
              {isUnread ? (
                <span className="my-auto block h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
              ) : null}
              <RecipientsList mailThread={mailThread} />
            </div>
            <p
              className={`font-normal text-foreground/60 ${isUnread ? 'md:font-semibold' : ''} md:text-inherit`}
            >
              {lastConversation.fileMetadata.appData.content.subject}
            </p>
          </div>
          <p className="ml-auto text-sm text-foreground/50">
            {formatToTimeAgoWithRelativeDetail(
              new Date(lastConversation.fileMetadata.created),
              true
            )}
          </p>
        </div>

        {/* <MailConversationAttachments /> */}
      </div>
    </Link>
  );
};

const RecipientsList = ({ mailThread }: { mailThread: DriveSearchResult<MailConversation>[] }) => {
  const identity = useDotYouClientContext().getIdentity();
  const allRecipients = getAllRecipients(mailThread[0]);

  const anyReply = mailThread.some(
    (conv) =>
      (conv.fileMetadata.senderOdinId || conv.fileMetadata.appData.content.sender) === identity
  );

  const lastReceivedConversation = mailThread.find(
    (conv) =>
      (conv.fileMetadata.senderOdinId || conv.fileMetadata.appData.content.sender) !== identity
  );
  const anyReceived = !!lastReceivedConversation;

  const numberOfConversations = mailThread.length;
  const onlySent = anyReply && !anyReceived;

  const filteredRecipients = allRecipients.filter((recipient) =>
    recipient === identity ? anyReply : anyReceived
  );

  return (
    <>
      <span className="overflow-hidden overflow-ellipsis text-nowrap">
        {onlySent ? (
          <>
            {t('To')}:{' '}
            <InnerRecipients
              recipients={allRecipients.filter((recipient) => recipient !== identity)}
            />
          </>
        ) : (
          <InnerRecipients recipients={filteredRecipients} />
        )}
      </span>
      {numberOfConversations !== 1 ? <span>({numberOfConversations})</span> : null}
    </>
  );
};

const InnerRecipients = ({ recipients }: { recipients: string[] }) => {
  const identity = useDotYouClientContext().getIdentity();

  return recipients.map((recipient, index) => (
    <React.Fragment key={recipient}>
      {recipient === identity ? t('Me') : <ConnectionName odinId={recipient} />}
      {recipients.length - 1 === index ? null : `, `}
    </React.Fragment>
  ));
};

const MailConversationAttachments = () => {
  return <div className="flex flex-row justify-end"></div>;
};
