import {
  formatToTimeAgoWithRelativeDetail,
  Checkbox,
  ActionGroup,
  ActionButton,
  Trash,
  t,
  flattenInfinteData,
  LoadingBlock,
  ConnectionName,
} from '@youfoundation/common-app';
import { Link } from 'react-router-dom';
import { ROOT_PATH } from '../../app/App';
import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { Archive } from '@youfoundation/common-app';
import { useMailConversations } from '../../hooks/mail/useMailConversations';
import { MailConversation } from '../../providers/MailProvider';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

const PAGE_SIZE = 100;
export const MailConversations = () => {
  const [selection, setSelection] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  useEffect(() => setSelection([]), [isAllSelected]);

  // TODO: needs to get updated so it only shows the last message of a conversation.. And groups the others within
  const {
    data: conversations,
    hasNextPage: hasMorePosts,
    isLoading: conversationsLoading,
    fetchNextPage,
    isFetchingNextPage,
  } = useMailConversations().mails;

  // Flatten all pages, sorted descending and slice on the max number expected
  const flattenedConversations = useMemo(
    () =>
      flattenInfinteData<DriveSearchResult<MailConversation>>(
        conversations,
        PAGE_SIZE,
        (a, b) =>
          (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
          (a.fileMetadata.appData.userDate || a.fileMetadata.created)
      ),
    [conversations]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: flattenedConversations?.length + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 120, // Rough size of a postTeasercard
    scrollMargin: parentOffsetRef.current,
    // overscan: 5, // Amount of items to load before and after (improved performance especially with images)
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= flattenedConversations?.length - 1 && hasMorePosts && !isFetchingNextPage)
      fetchNextPage();
  }, [
    hasMorePosts,
    fetchNextPage,
    flattenedConversations?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  return (
    <section className="mx-5 my-5 flex flex-grow flex-col">
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
      ) : flattenedConversations?.length ? (
        <div className="flex-grow" ref={parentRef}>
          <div
            className="relative w-full"
            style={{
              height: virtualizer.getTotalSize(),
            }}
          >
            <div
              className="absolute left-0 top-0 z-10 w-full"
              style={{
                transform: `translateY(${items[0]?.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {items.map((virtualRow) => {
                const isLoaderRow = virtualRow.index > flattenedConversations.length - 1;
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
                      ) : (
                        <div className="italic opacity-50" key={'no-more'}>
                          {t('No more conversations')}
                        </div>
                      )}
                    </div>
                  );
                }

                const conversation = flattenedConversations[virtualRow.index];
                const conversationId = conversation.fileMetadata.appData.uniqueId as string;
                const isSelected = selection.includes(conversationId);

                return (
                  <MailConversationItem
                    key={conversation.fileId}
                    conversation={conversation}
                    toggleSelection={() =>
                      setSelection(
                        isSelected
                          ? [
                              ...selection.filter(
                                (selected) => !stringGuidsEqual(selected, conversationId)
                              ),
                            ]
                          : [...selection, conversationId]
                      )
                    }
                    isSelected={selection.includes(conversationId) || isAllSelected}
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
  selection: string[];
  isAllSelected: boolean;
  toggleAllSelection: () => void;
}) => {
  const hasASelection = selection.length > 0;

  return (
    <div className="flex flex-row items-center rounded-t-lg border-b border-b-slate-100 bg-white px-3 py-1 dark:border-b-slate-700 dark:bg-black">
      <Checkbox checked={isAllSelected} onChange={toggleAllSelection} className="mr-6" />
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
            onClick={() => {
              //
            }}
          />
          <ActionButton
            type="mute"
            className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
            size="none"
            icon={Archive}
            onClick={() => {
              //
            }}
          />
        </>
      ) : null}

      <ActionGroup
        type="mute"
        size="none"
        className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
        options={[
          {
            label: 'Mark as unread',
            onClick: () => {
              //
            },
          },
          {
            label: 'Mark as read',
            onClick: () => {
              //
            },
          },
        ]}
      />
    </div>
  );
};

const MailConversationItem = ({
  conversation,
  toggleSelection,
  isSelected,
}: {
  conversation: DriveSearchResult<MailConversation>;
  toggleSelection: () => void;
  isSelected: boolean;
}) => {
  const threadId = conversation.fileMetadata.appData.groupId as string;
  const isUnread = !conversation.fileMetadata.appData.content.isRead;

  return (
    <Link to={`${ROOT_PATH}/${threadId}`} className="group">
      <div
        className={`relative flex flex-col gap-2 border-b border-b-slate-100 p-3 transition-colors group-last-of-type:border-0 dark:border-b-slate-700
          ${isSelected ? 'bg-primary/10' : ''}
          ${!isSelected ? `group-hover:bg-slate-100 dark:group-hover:bg-slate-900 ${isUnread ? 'bg-white dark:bg-black' : 'border-b-slate-200 bg-slate-50 dark:bg-slate-950'}` : ''}`}
      >
        <div
          className={`flex flex-row items-center justify-between gap-4 md:gap-8 ${isUnread ? 'font-semibold' : ''}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleSelection();
            }}
            className="absolute bottom-0 left-0 top-0 z-10 w-10"
          />
          <Checkbox checked={isSelected} readOnly />
          <div className="flex flex-col md:contents">
            <p>
              {conversation.fileMetadata.senderOdinId ? (
                <ConnectionName odinId={conversation.fileMetadata.senderOdinId} />
              ) : (
                t('Me')
              )}
            </p>
            <p className="text-foreground/60 md:text-inherit">
              {conversation.fileMetadata.appData.content.subject}
            </p>
          </div>
          <p className="ml-auto text-foreground/50">
            {formatToTimeAgoWithRelativeDetail(new Date(), true)}
          </p>
        </div>

        {/* <MailConversationAttachments /> */}
      </div>
    </Link>
  );
};

const MailConversationAttachments = () => {
  return <div className="flex flex-row justify-end"></div>;
};
