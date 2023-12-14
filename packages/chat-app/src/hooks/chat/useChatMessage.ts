import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import { ChatDeliveryStatus, ChatMessage, getChatMessage } from '../../providers/ChatProvider';
import {
  NewDriveSearchResult,
  SecurityGroupType,
  TransferStatus,
} from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { updateChatMessage, uploadChatMessage } from '../../providers/ChatProvider';
import { NewMediaFile } from '@youfoundation/js-lib/public';

export const useChatMessage = (props?: { messageId: string | undefined }) => {
  const { getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const getMessageByUniqueId = async (messageId: string) => {
    // TODO: Improve by fetching the message from the cache on conversations first
    return await getChatMessage(dotYouClient, messageId);
  };

  const sendMessage = async ({
    conversationId,
    recipients,
    replyId,
    files,
    message,
  }: {
    conversationId: string;
    recipients: string[];
    replyId?: string;
    files?: NewMediaFile[];
    message: string;
  }): Promise<NewDriveSearchResult<ChatMessage> | null> => {
    const newChatId = getNewId();
    const newChat: NewDriveSearchResult<ChatMessage> = {
      fileMetadata: {
        appData: {
          uniqueId: newChatId,
          groupId: conversationId,
          content: {
            message: message,
            deliveryStatus: ChatDeliveryStatus.Sent,
            replyId: replyId,
          },
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadChatMessage(dotYouClient, newChat, recipients, files);
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newChat.fileId = uploadResult.file.fileId;
    newChat.fileMetadata.versionTag = uploadResult.newVersionTag;

    const deliveredToInboxes = recipients.map(
      (recipient) =>
        uploadResult.recipientStatus[recipient].toLowerCase() === TransferStatus.DeliveredToInbox
    );

    if (deliveredToInboxes.every((delivered) => delivered)) {
      newChat.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Delivered;
      await updateChatMessage(dotYouClient, newChat, recipients, uploadResult.keyHeader);
    }

    return newChat;
  };

  return {
    get: useQuery({
      queryKey: ['chat-message', props?.messageId],
      queryFn: () => getMessageByUniqueId(props?.messageId as string),
      enabled: !!props?.messageId,
    }),
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
