import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import { Conversation } from '../../providers/ConversationProvider';
import { ChatDeliveryStatus, ChatMessage, MessageType } from '../../providers/ChatProvider';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
  TransferStatus,
} from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';
import {
  requestMarkAsRead,
  updateChatMessage,
  uploadChatMessage,
} from '../../providers/ChatProvider';

export const useChatMessage = () => {
  const { getIdentity, getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const identity = getIdentity();
  const queryClient = useQueryClient();

  const sendMessage = async ({
    conversationId,
    recipients,
    message,
  }: {
    conversationId: string;
    recipients: string[];
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
            authorOdinId: identity || '',
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

  const markAsRead = async ({
    conversation,
    message,
  }: {
    conversation: Conversation;
    message: DriveSearchResult<ChatMessage>;
  }) => {
    if (
      !message.fileMetadata.globalTransitId ||
      message.fileMetadata.appData.content.deliveryStatus === ChatDeliveryStatus.Read ||
      !message.fileMetadata.senderOdinId
    )
      return null;

    await requestMarkAsRead(dotYouClient, conversation, [message.fileMetadata.globalTransitId]);

    // TODO: Should we update the local file as well? And can we,
    //  without breaking the state that you are editing a message that you received...
    // [TEMP] Currently fixed with an authorOdinId on the chat message itself...
    message.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Read;
    message.fileMetadata.appData.content.authorOdinId =
      message.fileMetadata.senderOdinId || message.fileMetadata.appData.content.authorOdinId;
    await updateChatMessage(dotYouClient, message);
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
    markAsRead: useMutation({
      mutationFn: markAsRead,
      // onMutate: async ({ conversation, recipients, message }) => {
      //   // TODO: Optimistic update of the chat messages append the new message to the list
      // },
      // onSettled: async (_data, _error, variables) => {
      //   queryClient.invalidateQueries({ queryKey: ['chat', variables.conversationId] });
      // },
    }),
  };
};
