import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import { ChatMessage, ChatMessageContent, MessageType } from '../../providers/ConversationProvider';
import { NewDriveSearchResult, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { uploadChatMessage } from '../../providers/ChatProvider';

export const useChatMessage = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const sendMessage = async ({
    conversationId,
    recipients,
    message,
  }: {
    conversationId: string;
    recipients: string[];
    message: ChatMessageContent;
  }) => {
    const newChatId = getNewId();
    if (!recipients?.length) return;

    const newChat: NewDriveSearchResult<ChatMessage> = {
      fileMetadata: {
        appData: {
          content: {
            id: newChatId,
            conversationId: conversationId,
            message: message,
            recipients: recipients,
            messageType: MessageType.Text,
          },
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadChatMessage(dotYouClient, newChat);
    return { newChatId, ...uploadResult };
  };

  return {
    send: useMutation({
      mutationFn: sendMessage,
      onMutate: async ({ conversationId, recipients, message }) => {
        // TODO: Optimistic update of the chat messages append the new message to the list
      },
      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({ queryKey: ['chat', variables.conversationId] });
      },
    }),
  };
};
