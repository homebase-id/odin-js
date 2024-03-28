import { DotYouClient, SecurityGroupType } from '@youfoundation/js-lib/core';
import {
  GroupConversation,
  JOIN_CONVERSATION_COMMAND,
  JOIN_GROUP_CONVERSATION_COMMAND,
  JoinConversationRequest,
  JoinGroupConversationRequest,
  SingleConversation,
  UPDATE_GROUP_CONVERSATION_COMMAND,
  UpdateGroupConversationRequest,
  getConversation,
  updateConversation,
  uploadConversation,
} from './ConversationProvider';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';
import { ReceivedCommand } from '@youfoundation/js-lib/core';
import { QueryClient } from '@tanstack/react-query';
import {
  ChatDeliveryStatus,
  MARK_CHAT_READ_COMMAND,
  MarkAsReadRequest,
  getChatMessageByGlobalTransitId,
  updateChatMessage,
} from './ChatProvider';
import { getSingleConversation } from '../hooks/chat/useConversation';

export const processCommand = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  command: ReceivedCommand,
  identity: string
) => {
  if (command.clientCode === JOIN_CONVERSATION_COMMAND)
    return await joinConversation(dotYouClient, queryClient, command);

  if (command.clientCode === JOIN_GROUP_CONVERSATION_COMMAND && identity)
    return await joinGroupConversation(dotYouClient, queryClient, command, identity);

  if (command.clientCode === MARK_CHAT_READ_COMMAND)
    return await markChatAsRead(dotYouClient, queryClient, command);

  if (command.clientCode === UPDATE_GROUP_CONVERSATION_COMMAND) {
    return await updateGroupConversation(dotYouClient, queryClient, command);
  }
};

const joinConversation = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  command: ReceivedCommand
) => {
  const joinConversationRequest = tryJsonParse<JoinConversationRequest>(command.clientJsonMessage);
  try {
    await uploadConversation(dotYouClient, {
      fileMetadata: {
        appData: {
          uniqueId: joinConversationRequest.conversationId,
          content: {
            title: joinConversationRequest.title,
            recipient: command.sender,
          },
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    if (ex?.response?.data?.errorCode === 'existingFileWithUniqueId') return command.id;

    console.error(ex);
    return null;
  }

  return command.id;
};

const joinGroupConversation = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  command: ReceivedCommand,
  identity: string
) => {
  const joinConversationRequest = tryJsonParse<JoinGroupConversationRequest>(
    command.clientJsonMessage
  );

  const recipients = joinConversationRequest?.recipients?.filter(
    (recipient) => recipient !== identity
  );
  if (!recipients?.length) return command.id;
  recipients.push(command.sender);

  try {
    await uploadConversation(dotYouClient, {
      fileMetadata: {
        appData: {
          uniqueId: joinConversationRequest.conversationId,
          content: {
            title: joinConversationRequest.title,
            recipients: recipients,
          },
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    if (ex?.response?.data?.errorCode === 'existingFileWithUniqueId') return command.id;

    console.error(ex);
    return null;
  }

  return command.id;
};

const updateGroupConversation = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  command: ReceivedCommand
) => {
  const updateGroupConversation = tryJsonParse<UpdateGroupConversationRequest>(
    command.clientJsonMessage
  );
  const conversation = await getSingleConversation(
    dotYouClient,
    updateGroupConversation.conversationId
  );
  if (!conversation) return null;
  conversation.fileMetadata.appData.content.title = updateGroupConversation.title;
  await updateConversation(dotYouClient, conversation);
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
  return command.id;
};

const markChatAsRead = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  command: ReceivedCommand
) => {
  const markAsReadRequest = tryJsonParse<MarkAsReadRequest>(command.clientJsonMessage);
  const conversationId = markAsReadRequest.conversationId;
  const chatGlobalTransIds = markAsReadRequest.messageIds;

  if (!conversationId || !chatGlobalTransIds) return null;

  const conversation = await getConversation(dotYouClient, conversationId);
  if (!conversation) return null;
  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = (conversationContent as GroupConversation).recipients || [
    (conversationContent as SingleConversation).recipient,
  ];
  if (!recipients.filter(Boolean)?.length) return null;

  const chatMessages = await Promise.all(
    chatGlobalTransIds.map((msgId) =>
      getChatMessageByGlobalTransitId(dotYouClient, conversationId, msgId)
    )
  );
  const updateSuccess = await Promise.all(
    chatMessages
      // Only update messages from the current user
      .filter(
        (chatMessage) =>
          !chatMessage?.fileMetadata.senderOdinId || chatMessage?.fileMetadata.senderOdinId === ''
      )
      .map(async (chatMessage) => {
        if (!chatMessage) return false;

        chatMessage.fileMetadata.appData.content.deliveryDetails = {
          ...chatMessage.fileMetadata.appData.content.deliveryDetails,
        };
        chatMessage.fileMetadata.appData.content.deliveryDetails[command.sender] =
          ChatDeliveryStatus.Read;

        // Single recipient conversation
        if (recipients.length === 1)
          chatMessage.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Read;

        const keys = Object.keys(chatMessage.fileMetadata.appData.content.deliveryDetails);
        const allRead = keys.every(
          (key) =>
            chatMessage.fileMetadata.appData.content.deliveryDetails?.[key] ===
            ChatDeliveryStatus.Read
        );
        if (recipients.length === keys.length && allRead) {
          chatMessage.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Read;
        }
        try {
          const updateResult = await updateChatMessage(dotYouClient, chatMessage, recipients);
          return !!updateResult;
        } catch (ex) {
          console.error(ex);
          return false;
        }
      })
  );

  queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
  if (updateSuccess.every((success) => success)) return command.id;
  return null;
};
