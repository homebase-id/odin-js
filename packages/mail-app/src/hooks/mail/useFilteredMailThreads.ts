import { useMemo } from 'react';
import { flattenInfinteData } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  MailConversation,
  DEFAULT_ARCHIVAL_STATUS,
  ARCHIVE_ARCHIVAL_STATUS,
  REMOVE_ARCHIVAL_STATUS,
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
} from '../../providers/MailProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { useMailConversations } from './useMailConversations';
import fuzzysort from 'fuzzysort';

const PAGE_SIZE = 100;
export type MailThreadsFilter = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';

export const useFilteredMailThreads = (filter: MailThreadsFilter, query: string | undefined) => {
  const identity = useDotYouClientContext().getIdentity();
  const {
    data: conversations,
    hasNextPage: hasMorePosts,
    isLoading: conversationsLoading,
    fetchNextPage,
    isFetchingNextPage,
  } = useMailConversations().mails;

  // Flatten all pages, sorted descending and slice on the max number expected
  const threads = useMemo(() => {
    const flattenedConversations = flattenInfinteData<DriveSearchResult<MailConversation>>(
      conversations,
      PAGE_SIZE,
      (a, b) =>
        (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
        (a.fileMetadata.appData.userDate || a.fileMetadata.created)
    );
    if (!flattenedConversations) return [];

    const filteredConversations = flattenedConversations.filter((conversation) => {
      const sender =
        conversation.fileMetadata.senderOdinId || conversation.fileMetadata.appData.content.sender;

      // Remove "drafts" from all but the drafts filter
      if (
        filter !== 'drafts' &&
        conversation.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE
      )
        return false;

      // Remove "removed" from all but the trash filter
      if (
        filter !== 'trash' &&
        conversation.fileMetadata.appData.archivalStatus === REMOVE_ARCHIVAL_STATUS
      )
        return false;

      // Remove "archived" from all but the archive filter
      if (
        filter !== 'archive' &&
        conversation.fileMetadata.appData.archivalStatus === ARCHIVE_ARCHIVAL_STATUS
      )
        return false;

      if (filter === 'inbox') {
        return (
          !conversation.fileMetadata.appData.archivalStatus ||
          conversation.fileMetadata.appData.archivalStatus === DEFAULT_ARCHIVAL_STATUS
        );
      } else if (filter === 'sent') {
        return !sender || sender === identity;
      } else if (filter === 'archive') {
        return conversation.fileMetadata.appData.archivalStatus === ARCHIVE_ARCHIVAL_STATUS;
      } else if (filter === 'trash') {
        return conversation.fileMetadata.appData.archivalStatus === REMOVE_ARCHIVAL_STATUS;
      } else if (filter === 'drafts') {
        // Remove all but drafts from the drafts filter
        return conversation.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE;
      }

      return true;
    });

    // Group the flattenedConversations by their groupId
    const threadsDictionary = filteredConversations.reduce(
      (acc, conversation) => {
        const threadId = conversation.fileMetadata.appData.groupId as string;

        if (!acc[threadId]) acc[threadId] = [conversation];
        else acc[threadId].push(conversation);

        return acc;
      },
      {} as Record<string, DriveSearchResult<MailConversation>[]>
    );
    const threads = Object.values(threadsDictionary);

    const filteredThreads = threads.filter((thread) => {
      // Don't remove messages from yourself when searching
      if (filter === 'inbox') {
        return thread.some((conversation) => {
          const sender =
            conversation.fileMetadata.senderOdinId ||
            conversation.fileMetadata.appData.content.sender;
          return sender !== identity;
        });
      }

      return true;
    });

    // TODO: Investigate if we can prepare in the useMailConversations hook; So it's stored in cache "indexed"
    const today = new Date().getTime();
    const searchResults = query
      ? fuzzysort
          .go(query, filteredConversations, {
            keys: [
              'fileMetadata.appData.content.subject',
              'fileMetadata.appData.content.plainMessage',
            ],
            threshold: -10000,
            scoreFn: (a) => {
              // Less than 0 days old, no penalty
              const agePenalty = Math.abs(
                Math.round(
                  (today -
                    (a as unknown as { obj: DriveSearchResult<MailConversation> }).obj.fileMetadata
                      .created) /
                    (1000 * 60 * 60 * 24)
                )
              );

              // -100 to the plainMessage score makes it a worse match than a subject match
              return (
                Math.max(a[0] ? a[0].score : -Infinity, a[1] ? a[1].score - 100 : -Infinity) -
                agePenalty
              );
            },
          })
          .map((result) => ({
            originId: result.obj.fileMetadata.appData.content.originId,
            threadId: result.obj.fileMetadata.appData.content.threadId,
          }))
      : null;

    if (searchResults) {
      return searchResults
        .map((thread) =>
          filteredThreads.find(
            (conversation) =>
              conversation[0]?.fileMetadata.appData.content.threadId === thread.threadId
          )
        )
        .filter(Boolean) as DriveSearchResult<MailConversation>[][];
    }

    return filteredThreads;
  }, [filter, query, conversations]);

  return {
    threads,
    hasMorePosts,
    conversationsLoading,
    fetchNextPage,
    isFetchingNextPage,
  };
};
