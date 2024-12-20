import { useQueryClient, useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
import {
  ConversationMetadata,
  uploadConversationMetadata,
  getConversationMetadata,
} from '../../providers/ConversationProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useConversationMetadata = (props?: { conversationId?: string | undefined }) => {
  const { conversationId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getMetadata = async (conversationId: string) => {
    const serverFile = await getConversationMetadata(dotYouClient, conversationId);
    if (!serverFile) {
      const newMetadata: NewHomebaseFile<ConversationMetadata> = {
        fileMetadata: {
          appData: {
            tags: [conversationId],
            content: {
              conversationId,
              lastReadTime: 0,
            },
          },
        },
        serverMetadata: {
          accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
        },
      };

      return newMetadata;
    }
    return serverFile;
  };

  const saveMetadata = async ({
    conversation,
  }: {
    conversation: HomebaseFile<ConversationMetadata> | NewHomebaseFile<ConversationMetadata>;
  }) => {
    return await uploadConversationMetadata(dotYouClient, conversation, async () => {
      if (!conversation.fileMetadata.appData.tags?.[0]) return;
      const serverVersion = await getConversationMetadata(
        dotYouClient,
        conversation.fileMetadata.appData.tags[0]
      );
      if (!serverVersion) return;

      return await uploadConversationMetadata(dotYouClient, {
        ...conversation,
        fileMetadata: {
          ...conversation.fileMetadata,
          versionTag: serverVersion.fileMetadata.versionTag,
        },
      });
    });
  };

  return {
    single: useQuery({
      queryKey: ['conversation-metadata', conversationId],
      queryFn: () => getMetadata(conversationId as string),
      enabled: !!conversationId,
      staleTime: 1000 * 60 * 60 * 24, // 24h, updates will come in via websocket
    }),
    update: useMutation({
      mutationFn: saveMetadata,
      onMutate: async (variables) => {
        if (!variables.conversation.fileId) {
          // Ignore optimistic updates for new conversation metadata
          return;
        }

        queryClient.setQueryData<HomebaseFile<ConversationMetadata>>(
          ['conversation-metadata', variables.conversation.fileMetadata.appData.uniqueId],
          variables.conversation as HomebaseFile<ConversationMetadata>
        );
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
