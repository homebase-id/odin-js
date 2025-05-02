import { useQueryClient, useMutation } from '@tanstack/react-query';
import { getFileHeader, getLocalContentFromHeader, HomebaseFile, uploadLocalMetadataContent } from '@homebase-id/js-lib/core';
import {
  ConversationMetadata,
  UnifiedConversation,
  ChatDrive,
} from '../../providers/ConversationProvider';
import { useOdinClientContext } from '@homebase-id/common-app';
import { useConversation } from './useConversation';
import { insertNewConversation } from './useConversations';

export const useConversationMetadata = (props?: { conversationId?: string | undefined }) => {
  const { conversationId } = props || {};
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const conversationQuery = useConversation({
    conversationId,
  }).single;

  const saveMetadata = async ({
    conversation,
    newMetadata,
  }: {
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
    newMetadata: ConversationMetadata;
  }) => {
    let maxRetries = 5;
    const onVersionConflict = async () => {
      if (maxRetries <= 0) return;
      maxRetries--;

      const serverHeader = await getFileHeader(odinClient, ChatDrive, conversation.fileId);
      if (!serverHeader) return;

      const serverLocalData = await getLocalContentFromHeader<ConversationMetadata>(odinClient, ChatDrive, serverHeader, true);
      const mergedData: ConversationMetadata = {
        conversationId: newMetadata.conversationId,
        lastReadTime: Math.max((newMetadata.lastReadTime || 0), (serverLocalData?.lastReadTime || 0)),
      }

      return await uploadLocalMetadataContent(odinClient, ChatDrive, serverHeader, {
        ...serverHeader.fileMetadata.localAppData,
        content: mergedData
      });
    };

    return await uploadLocalMetadataContent(odinClient, ChatDrive, conversation, {
      ...conversation.fileMetadata.localAppData,
      content: newMetadata,
    }, onVersionConflict);
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
