import { useQueryClient, useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import {
  HomebaseFile,
  uploadLocalMetadataContent,
  getLocalContentFromHeader,
} from '@homebase-id/js-lib/core';
import {
  ConversationMetadata,
  getConversationMetadata,
  UnifiedConversation,
  ChatDrive,
} from '../../providers/ConversationProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { useConversation } from './useConversation';
import { insertNewConversation } from './useConversations';
import { useEffect } from 'react';

export const useConversationMetadata = (props?: { conversationId?: string | undefined }) => {
  const { conversationId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const { data: conversation, isFetched: conversationFetched } = useConversation({
    conversationId,
  }).single;

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['conversation-metadata', conversationId] });
  }, [conversation]);

  const getMetadata = async (conversationId: string) => {
    const localContent = conversation?.fileMetadata.localAppData?.content;
    if (localContent) {
      try {
        const localMetadata = await getLocalContentFromHeader<ConversationMetadata>(
          dotYouClient,
          ChatDrive,
          conversation,
          true
        );

        if (localMetadata) {
          return localMetadata;
        } else {
          console.log('localMetadata is undefined');
          return {
            conversationId,
            lastReadTime: 0,
          };
        }
      } catch (error) {
        console.error('Error getting local metadata', error);
        return {
          conversationId,
          lastReadTime: 0,
        };
      }
    }

    const serverFile = await getConversationMetadata(dotYouClient, conversationId);
    return (
      serverFile?.fileMetadata.appData.content || {
        conversationId,
        lastReadTime: 0,
      }
    );
  };

  const saveMetadata = async ({
    conversation,
    newMetadata,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
    newMetadata: ConversationMetadata;
  }) => {
    return await uploadLocalMetadataContent(dotYouClient, ChatDrive, conversation, {
      ...conversation.fileMetadata.localAppData,
      content: JSON.stringify(newMetadata),
    });
  };

  return {
    single: useQuery({
      queryKey: ['conversation-metadata', conversationId],
      queryFn: () => getMetadata(conversationId as string),
      enabled: !!conversationId && conversationFetched,
      staleTime: 1000 * 60 * 60 * 24, // 24h, updates will come in via websocket
    }),
    update: useMutation({
      mutationFn: saveMetadata,
      onMutate: async (variables) => {
        if (!variables.conversation.fileId) {
          // Ignore optimistic updates for new conversation metadata
          return;
        }

        const newUnifiedConversation: HomebaseFile<UnifiedConversation> = {
          ...variables.conversation,
          fileMetadata: {
            ...variables.conversation.fileMetadata,
            localAppData: {
              ...variables.conversation.fileMetadata.localAppData,
              content: variables.newMetadata as unknown as string,
            },
          },
        };
        insertNewConversation(queryClient, newUnifiedConversation);
      },
      onError: (error) => {
        console.error('Error saving conversation metadata', error);
      },
      retry: 1,
    }),
  };
};

export const insertNewConversationMetadata = (
  queryClient: QueryClient,
  newConversation: HomebaseFile<ConversationMetadata>
) => {
  queryClient.setQueryData(
    ['conversation-metadata', newConversation.fileMetadata.appData.tags?.[0]],
    newConversation
  );
};

export const invalidateConversationMetadata = (
  queryClient: QueryClient,
  conversationId?: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['conversation-metadata', conversationId].filter(Boolean),
    exact: !!conversationId,
  });
};
