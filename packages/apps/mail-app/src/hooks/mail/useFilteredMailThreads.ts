import { useMemo } from 'react';
import { flattenInfinteData } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import {
  MailConversation,
  DEFAULT_ARCHIVAL_STATUS,
  ARCHIVE_ARCHIVAL_STATUS,
  REMOVE_ARCHIVAL_STATUS,
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
} from '../../providers/MailProvider';
import { useOdinClientContext } from '@homebase-id/common-app';
import { MAIL_CONVERSATIONS_PAGE_SIZE, useMailConversations } from './useMailConversations';
import fuzzysort from 'fuzzysort';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export type MailThreadsFilter = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';

export const useFilteredMailThreads = (filter: MailThreadsFilter, query: string | undefined) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const {
    data: conversations,
    hasNextPage: hasMorePosts,
    isLoading: conversationsLoading,
    fetchNextPage,
    isFetchingNextPage,
  } = useMailConversations().mails;

  const flattenedConversations = useMemo(
    () =>
      flattenInfinteData<HomebaseFile<MailConversation>>(
        conversations,
        hasMorePosts ? MAIL_CONVERSATIONS_PAGE_SIZE : undefined,
        (a, b) =>
          (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
          (a.fileMetadata.appData.userDate || a.fileMetadata.created)
      ),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    if (!flattenedConversations) return [];

    return flattenedConversations.filter((conversation) => {
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

      if (filter === 'inbox')
        return (
          !conversation.fileMetadata.appData.archivalStatus ||
          conversation.fileMetadata.appData.archivalStatus === DEFAULT_ARCHIVAL_STATUS
        );

      if (filter === 'sent') return !sender || sender === loggedOnIdentity;

      if (filter === 'archive')
        return conversation.fileMetadata.appData.archivalStatus === ARCHIVE_ARCHIVAL_STATUS;

      if (filter === 'trash')
        return conversation.fileMetadata.appData.archivalStatus === REMOVE_ARCHIVAL_STATUS;

      if (filter === 'drafts')
        return conversation.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE;

      return true;
    });
  }, [flattenedConversations, filter]);

  const threadsDictionary = useMemo(() => {
    if (!filteredConversations) return {} as Record<string, HomebaseFile<MailConversation>[]>;

    // Group the flattenedConversations by their groupId
    return filteredConversations.reduce(
      (acc, conversation) => {
        const threadId = conversation.fileMetadata.appData.groupId as string;

        if (!acc[threadId]) acc[threadId] = [conversation];
        else acc[threadId].push(conversation);

        return acc;
      },
      {} as Record<string, HomebaseFile<MailConversation>[]>
    );
  }, [filteredConversations]);

  // TODO: Investigate if we can prepare in the useMailConversations hook; So it's stored in cache "indexed"
  const threads = useMemo(() => {
    const today = new Date().getTime();
    const searchResults = query
      ? fuzzysort
        .go(query, filteredConversations, {
          keys: [
            'fileMetadata.appData.content.subject',
            'fileMetadata.appData.content.plainMessage',
            'fileMetadata.appData.content.plainAttachment',
          ],
          threshold: -10000,
          scoreFn: (a) => {
            // Less than 0 days old, no penalty
            const agePenalty = Math.abs(
              Math.round(
                (today -
                  (a as unknown as { obj: HomebaseFile<MailConversation> }).obj.fileMetadata
                    .created) /
                (1000 * 60 * 60 * 24)
              )
            );

            // -100 to the plainMessage score makes it a worse match than a subject match
            return (
              Math.max(
                a[0] ? a[0].score : -Infinity,
                a[1] ? a[1].score - 100 : -Infinity,
                a[2] ? a[2].score - 50 : -Infinity
              ) - agePenalty
            );
          },
        })
        .map((result) => ({
          originId: result.obj.fileMetadata.appData.content.originId,
          threadId: result.obj.fileMetadata.appData.content.threadId,
        }))
      : [];

    // filter threadsDictionary by searchResults if there's a query
    const filteredThreads = Object.keys(threadsDictionary)
      .filter((threadId) => {
        return (
          !query ||
          searchResults.some((searchResult) => stringGuidsEqual(searchResult.threadId, threadId))
        );
      })
      .map((threadId) => threadsDictionary[threadId]);

    return filteredThreads.filter((thread) => {
      // Remove threads with only messages from yourself when on inbox
      if (filter === 'inbox') {
        return thread.some((conversation) => {
          const fromMeToMe = conversation.fileMetadata.appData.content.recipients.every(
            (recipient) => recipient === loggedOnIdentity
          );
          if (fromMeToMe) return true;

          const sender =
            conversation.fileMetadata.senderOdinId ||
            conversation.fileMetadata.appData.content.sender;
          return sender !== loggedOnIdentity;
        });
      }

      return true;
    });
  }, [threadsDictionary, filteredConversations, filter, query]);

  return {
    threads,
    hasMorePosts,
    conversationsLoading,
    fetchNextPage,
    isFetchingNextPage,
  };
};
