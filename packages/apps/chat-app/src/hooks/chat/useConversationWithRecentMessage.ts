import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HomebaseFile } from '@homebase-id/js-lib/core';

import { useCallback, useEffect, useMemo } from 'react';
import { getChatMessageInfiniteQueryOptions } from './useChatMessages';
import { useConversations } from './useConversations';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { ChatMessage } from '../../providers/ChatProvider';
import { ConversationMetadata, UnifiedConversation } from '../../providers/ConversationProvider';

export type ConversationWithRecentMessage = HomebaseFile<
  UnifiedConversation,
  ConversationMetadata
> & {
  lastMessage: HomebaseFile<ChatMessage> | null;
};
export const useConversationsWithRecentMessage = () => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const { data: conversations } = useConversations().all;
  const flatConversations = useMemo(
    () =>
      (conversations?.pages
        ?.flatMap((page) => page?.searchResults)
        .filter(Boolean) as ConversationWithRecentMessage[]) || [],
    [conversations]
  );

  const buildConversationsWithLastMessage = useCallback(async () => {
    if (!flatConversations || !flatConversations || flatConversations.length === 0) return;

    const convoWithMessage: ConversationWithRecentMessage[] = await Promise.all(
      (
        flatConversations.filter(Boolean) as HomebaseFile<
          UnifiedConversation,
          ConversationMetadata
        >[]
      ).map(async (convo) => {
        const conversationId = convo.fileMetadata.appData.uniqueId;
        const messages = await queryClient.fetchInfiniteQuery(
          getChatMessageInfiniteQueryOptions(dotYouClient, conversationId)
        );
        return {
          ...convo,
          lastMessage: messages.pages[0].searchResults[0],
        };
      })
    );

    convoWithMessage.sort((a, b) => {
      return (
        (b.lastMessage?.fileMetadata.created || b.fileMetadata.updated) -
        (a.lastMessage?.fileMetadata.created || a.fileMetadata.updated)
      );
    });

    if (!convoWithMessage || !convoWithMessage.length) return;
    queryClient.setQueryData(['conversations-with-recent-message'], convoWithMessage, {
      updatedAt: Date.now(),
    });
  }, [flatConversations, dotYouClient, queryClient]);

  const lastUpdate = useLastUpdatedChatMessages();
  const lastConversationUpdate = useLastUpdatedConversations();

  useEffect(() => {
    if (lastUpdate === null || lastConversationUpdate === null) {
      console.warn('lastUpdate is null');
      return;
    }

    const currentCacheUpdate = queryClient.getQueryState(['conversations-with-recent-message']);
    if (
      currentCacheUpdate?.dataUpdatedAt &&
      lastUpdate !== 0 &&
      lastUpdate <= currentCacheUpdate?.dataUpdatedAt &&
      lastConversationUpdate !== 0 &&
      lastConversationUpdate <= currentCacheUpdate?.dataUpdatedAt
    )
      return;

    buildConversationsWithLastMessage();
  }, [lastUpdate, buildConversationsWithLastMessage, queryClient]);

  return {
    // We only setup a cache entry that we will fill up with the setQueryData later; So we can cache the data for offline and faster startup;
    all: useQuery({
      queryKey: ['conversations-with-recent-message'],
      queryFn: () => [] as ConversationWithRecentMessage[],
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }),
  };
};

const useLastUpdatedChatMessages = () => {
  const queryClient = useQueryClient();

  const lastUpdates = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['chat-messages'], exact: false })
    .map((query) => query.state.dataUpdatedAt);

  return lastUpdates.reduce((acc, val) => {
    if (val > acc) {
      return val;
    }

    return acc;
  }, 0);
};

const useLastUpdatedConversations = () => {
  const queryClient = useQueryClient();

  return (
    queryClient.getQueryCache().find({ queryKey: ['conversations'], exact: true })?.state
      .dataUpdatedAt || 0
  );
};
