import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import { ChatDeliveryStatus, ChatMessage, MessageType } from '../../providers/ChatProvider';
import {
  NewDriveSearchResult,
  SecurityGroupType,
  TransferStatus,
} from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { updateChatMessage, uploadChatMessage } from '../../providers/ChatProvider';
import { NewMediaFile } from '@youfoundation/js-lib/public';

export const useChatMessage = () => {
  const { getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const sendMessage = async ({
    conversationId,
    recipients,
    files,
    message,
  }: {
    conversationId: string;
    recipients: string[];
    files?: NewMediaFile[];
    message: string;
  }): Promise<NewDriveSearchResult<ChatMessage> | null> => {
    const newChatId = getNewId();
    if (!recipients?.length) return null;

    const newChat: NewDriveSearchResult<ChatMessage> = {
      fileMetadata: {
        appData: {
          content: {
            id: newChatId,
            conversationId: conversationId,
            message: message,
            recipients: recipients,
            messageType: MessageType.Text,
            deliveryStatus: ChatDeliveryStatus.Sent,
          },
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadChatMessage(dotYouClient, newChat, files);
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newChat.fileId = uploadResult.file.fileId;
    newChat.fileMetadata.versionTag = uploadResult.newVersionTag;

    const deliveredToInboxes = recipients.map(
      (recipient) =>
        uploadResult.recipientStatus[recipient].toLowerCase() === TransferStatus.DeliveredToInbox
    );

    if (deliveredToInboxes.every((delivered) => delivered)) {
      newChat.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Delivered;
      await updateChatMessage(dotYouClient, newChat, uploadResult.keyHeader);
    }

    return newChat;
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
