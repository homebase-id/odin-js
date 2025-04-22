import {
  Checkbox,
  ActionButton,
  t,
  LoadingBlock,
  ErrorNotification,
  ActionGroup,
  MAIL_ROOT_PATH,
} from '@homebase-id/common-app';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { Archive, Download, Trash } from '@homebase-id/common-app/icons';
import { MailConversation } from '../../providers/MailProvider';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useOdinClientContext } from '@homebase-id/common-app';
import { useMailThread } from '../../hooks/mail/useMailThread';
import { MailThreadsFilter, useFilteredMailThreads } from '../../hooks/mail/useFilteredMailThreads';
import { useMailConversation } from '../../hooks/mail/useMailConversation';
import { MailConversationItem } from './MailConversationItem';

export const MailThreads = ({
  filter,
  query,
}: {
  filter: MailThreadsFilter;
  query: string | undefined;
}) => {
  const [selection, setSelection] = useState<HomebaseFile<MailConversation>[][]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();

  // Don't auto load next pages when there's a query
  const autoPage = !query;

  const { hasMorePosts, conversationsLoading, fetchNextPage, isFetchingNextPage, threads } =
    useFilteredMailThreads(filter, query);

  useEffect(() => {
    if (isAllSelected) setSelection(threads);
    else setSelection([]);
  }, [isAllSelected]);

  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: threads?.length + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 40, // Rough size of a MailConversationItem
    scrollMargin: parentOffsetRef.current,
  });

  useEffect(() => {
    if (!autoPage) return;

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
    <section className="flex flex-grow flex-col bg-background">
      <MailConversationsHeader
        selection={selection}
        isAllSelected={isAllSelected}
        toggleAllSelection={() => setIsAllSelected(!isAllSelected)}
        clearSelection={() => {
          setSelection([]);
          setIsAllSelected(false);
        }}
        filter={filter}
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
              className="absolute left-0 top-0 w-full"
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
                      {(autoPage && hasMorePosts) || isFetchingNextPage ? (
                        <div className="animate-pulse text-slate-400" key={'loading'}>
                          {t('Loading...')}
                        </div>
                      ) : !autoPage && hasMorePosts ? (
                        <div>
                          <ActionButton
                            onClick={() => fetchNextPage()}
                            type="secondary"
                            icon={Download}
                          >
                            {t('Fetch more from the server')}
                          </ActionButton>
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
                        conv.fileMetadata.appData.content.sender) !== loggedOnIdentity
                  ) || mailThread[0];
                const lastConversationId = lastConversation.fileMetadata.appData.groupId as string;
                const isSelected = selection.some((select) =>
                  stringGuidsEqual(select[0].fileMetadata.appData.groupId, lastConversationId)
                );

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    data-fileid={lastConversation.fileId}
                    className="group"
                  >
                    <MailConversationItem
                      query={query}
                      data-key={lastConversation.fileId}
                      mailThread={mailThread}
                      pathPrefix={`${MAIL_ROOT_PATH}/${filter}/`}
                      toggleSelection={() => {
                        setIsAllSelected(false);
                        setSelection(
                          isSelected
                            ? [
                                ...selection.filter(
                                  (selected) =>
                                    !stringGuidsEqual(
                                      selected[0].fileMetadata.appData.groupId,
                                      lastConversationId
                                    )
                                ),
                              ]
                            : [...selection, mailThread]
                        );
                      }}
                      isSelected={isSelected}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3">
          <div className="italic opacity-50" key={'no-more'}>
            {query ? <>{t('No results for you query')}</> : t('No conversations')}
          </div>
          {query && hasMorePosts ? (
            <>
              <ActionButton
                className="mt-5"
                onClick={() => fetchNextPage()}
                type="secondary"
                icon={Download}
              >
                {t('Search more on the server')}
              </ActionButton>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
};

const MailConversationsHeader = ({
  selection,
  isAllSelected,
  toggleAllSelection,
  clearSelection,
  filter,
}: {
  selection: HomebaseFile<MailConversation>[][];
  isAllSelected: boolean;
  toggleAllSelection: () => void;
  clearSelection: () => void;
  filter?: MailThreadsFilter;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
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
    mutate: restoreThread,
    status: restoreThreadStatus,
    error: restoreThreadError,
  } = useMailThread().restore;

  const {
    markAsRead: { mutate: markAsRead, status: markAsReadStatus, error: markAsReadError },
    markAsUnread: { mutate: markAsUnread, status: markAsUnreadStatus, error: markAsUnreadError },
  } = useMailConversation();

  const doArchive = () => archiveThread(selection.flat());
  const doRemove = () => removeThread(selection.flat());
  const doRestore = () => restoreThread(selection.flat());
  const doMarkAsRead = () =>
    markAsRead({
      mailConversations: selection.map(
        (mailThread) =>
          mailThread.find(
            (conv) =>
              (conv.fileMetadata.senderOdinId || conv.fileMetadata.appData.content.sender) !==
              loggedOnIdentity
          ) || mailThread[0]
      ),
    });
  const doMarkAsUnread = () =>
    markAsUnread({
      mailConversations: selection.map(
        (mailThread) =>
          mailThread.find(
            (conv) =>
              (conv.fileMetadata.senderOdinId || conv.fileMetadata.appData.content.sender) !==
              loggedOnIdentity
          ) || mailThread[0]
      ),
    });

  useEffect(() => {
    if (
      removeThreadStatus === 'success' ||
      archiveThreadStatus === 'success' ||
      restoreThreadStatus === 'success' ||
      markAsReadStatus === 'success' ||
      markAsUnreadStatus === 'success'
    ) {
      clearSelection();
    }
  }, [
    removeThreadStatus,
    archiveThreadStatus,
    restoreThreadStatus,
    markAsReadStatus,
    markAsUnreadStatus,
  ]);

  return (
    <>
      <ErrorNotification
        error={
          restoreThreadError ||
          markAsReadError ||
          markAsUnreadError ||
          removeThreadError ||
          archiveThreadError
        }
      />
      <div className="sticky left-0 right-0 top-[3.7rem] z-10 flex flex-row items-center border-b border-b-slate-100 px-2 py-2 dark:border-b-slate-700">
        <div className="p-2">
          <button
            className="absolute bottom-0 left-0 top-0 z-10 w-10"
            onClick={toggleAllSelection}
          ></button>
          <Checkbox checked={isAllSelected} readOnly className="block" id={`select-all`} />
        </div>
        {hasASelection ? (
          <>
            {filter === 'archive' || filter === 'trash' ? (
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
            )}
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
