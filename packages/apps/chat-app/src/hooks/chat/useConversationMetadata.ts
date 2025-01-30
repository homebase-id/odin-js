import { useQueryClient, useMutation } from '@tanstack/react-query';
import { HomebaseFile, uploadLocalMetadataContent } from '@homebase-id/js-lib/core';
import {
  ConversationMetadata,
  UnifiedConversation,
  ChatDrive,
} from '../../providers/ConversationProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { useConversation } from './useConversation';
import { insertNewConversation } from './useConversations';

export const useConversationMetadata = (props?: { conversationId?: string | undefined }) => {
  const { conversationId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const conversationQuery = useConversation({
    conversationId,
  }).single;

  const saveMetadata = async ({
    conversation,
    newMetadata,
  }: {
    conversation: HomebaseFile<UnifiedConversation, unknown>;
    newMetadata: ConversationMetadata;
  }) => {
    return await uploadLocalMetadataContent(dotYouClient, ChatDrive, conversation, {
      ...conversation.fileMetadata.localAppData,
      content: newMetadata,
    });
  };

  return {
    single: conversationQuery,
    update: useMutation({
      mutationFn: saveMetadata,
      onMutate: async (variables) => {
        if (!variables.conversation.fileId) {
          // Ignore optimistic updates for new conversation metadata
          return;
        }

        const newUnifiedConversation: HomebaseFile<UnifiedConversation, ConversationMetadata> = {
          ...variables.conversation,
          fileMetadata: {
            ...variables.conversation.fileMetadata,
            localAppData: {
              ...variables.conversation.fileMetadata.localAppData,
              content: variables.newMetadata,
            },
          },
        };
        insertNewConversation(queryClient, newUnifiedConversation);
      },
      onError: (error) => {
        console.error('Error saving conversation metadata', error);
      },
      onSuccess: (data, variables) => {
        if (!data) return;

        const newUnifiedConversation: HomebaseFile<UnifiedConversation, ConversationMetadata> = {
          ...variables.conversation,
          fileMetadata: {
            ...variables.conversation.fileMetadata,
            localAppData: {
              ...variables.conversation.fileMetadata.localAppData,
              content: variables.newMetadata,
              versionTag: data.newLocalVersionTag,
            },
          },
        };

        insertNewConversation(queryClient, newUnifiedConversation);
      },
      retry: 1,
    }),
  };
};
