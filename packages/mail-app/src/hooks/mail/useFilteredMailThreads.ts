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

const PAGE_SIZE = 100;
export type MailThreadsFilter = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';

export const useFilteredMailThreads = (filter: MailThreadsFilter) => {
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

    const filteredConversations = flattenedConversations?.filter((conversation) => {
      const sender =
        conversation.fileMetadata.senderOdinId || conversation.fileMetadata.appData.content.sender;

      // Remove drafts from all but the drafts filter
      if (
        conversation.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE &&
        filter !== 'drafts'
      ) {
        return false;
      }

      // Remove removed from all but the trash filter
      if (
        conversation.fileMetadata.appData.archivalStatus === REMOVE_ARCHIVAL_STATUS &&
        filter !== 'trash'
      ) {
        return false;
      }

      // Remove archived from all but the archive filter
      if (
        conversation.fileMetadata.appData.archivalStatus === ARCHIVE_ARCHIVAL_STATUS &&
        filter !== 'archive'
      ) {
        return false;
      }

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

    // Sanity check, no grouping possible on drafts
    if (filter === 'drafts') return filteredConversations.map((conversation) => [conversation]);

    // Group the flattenedConversations by their groupId
    const threadsDictionary = filteredConversations?.reduce(
      (acc, conversation) => {
        const threadId = conversation.fileMetadata.appData.groupId as string;

        if (!acc[threadId]) {
          acc[threadId] = [conversation];
        } else {
          acc[threadId].push(conversation);
        }

        return acc;
      },
      {} as Record<string, DriveSearchResult<MailConversation>[]>
    );

    if (!threadsDictionary) return [];

    // TODO: Check if the ordering remains correct.. Probably not
    const threads = Object.keys(threadsDictionary).map((threadKey) => threadsDictionary[threadKey]);

    const filteredThreads = threads.filter((thread) => {
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

    return filteredThreads;
  }, [filter, conversations]);

  return {
    threads,
    hasMorePosts,
    conversationsLoading,
    fetchNextPage,
    isFetchingNextPage,
  };
};
