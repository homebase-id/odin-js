import { useRef } from 'react';
import {
  DotYouClient,
  SecurityGroupType,
  getCommands,
  markCommandComplete,
} from '@youfoundation/js-lib/core';
import { useEffect } from 'react';
import {
  ChatDrive,
  GroupConversation,
  JOIN_CONVERSATION_COMMAND,
  JOIN_GROUP_CONVERSATION_COMMAND,
  JoinConversationRequest,
  JoinGroupConversationRequest,
  SingleConversation,
  getConversation,
  uploadConversation,
} from '../../providers/ConversationProvider';
import { useDotYouClient } from '@youfoundation/common-app';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';
import { ReceivedCommand } from '@youfoundation/js-lib/dist/core/CommandData/CommandTypes';
import {
  ChatDeliveryStatus,
  MARK_CHAT_READ_COMMAND,
  MarkAsReadRequest,
  getChatMessages,
  updateChatMessage,
} from '../../providers/ChatProvider';

export const useChatCommandProcessor = () => {
  const { getDotYouClient, getIdentity } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const identity = getIdentity();

  const isProcessing = useRef(false);

  useEffect(() => {
    (async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;
      const commands = await getCommands(dotYouClient, ChatDrive);
      const completedCommands = await Promise.all(
        commands.receivedCommands
          .filter(
            (command) =>
              command.clientCode === JOIN_CONVERSATION_COMMAND ||
              command.clientCode === MARK_CHAT_READ_COMMAND ||
              command.clientCode === JOIN_GROUP_CONVERSATION_COMMAND
          )
          .map(async (command) => {
            if (command.clientCode === JOIN_CONVERSATION_COMMAND)
              return joinConversation(dotYouClient, command);

            if (command.clientCode === JOIN_GROUP_CONVERSATION_COMMAND && identity)
              return joinGroupConversation(dotYouClient, command, identity);

            if (command.clientCode === MARK_CHAT_READ_COMMAND)
              return markChatAsRead(dotYouClient, command);
          })
      );

      if (completedCommands.length > 0)
        await markCommandComplete(
          dotYouClient,
          ChatDrive,
          completedCommands.filter(Boolean) as string[]
        );

      isProcessing.current = false;
    })();
  }, []);
};

const joinConversation = async (dotYouClient: DotYouClient, command: ReceivedCommand) => {
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
  } catch (ex: any) {
    if (ex?.response?.data?.errorCode === 4105) return command.id;

    console.error(ex);
    return null;
  }

  return command.id;
};

const joinGroupConversation = async (
  dotYouClient: DotYouClient,
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
  } catch (ex: any) {
    if (ex?.response?.data?.errorCode === 4105) return command.id;

    console.error(ex);
    return null;
  }

  return command.id;
};

const markChatAsRead = async (dotYouClient: DotYouClient, command: ReceivedCommand) => {
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

  // It's a hack... This needs to change
  const getChatMessageByGlobalTransitId = async (globalTransitId: string) => {
    const allChatMessages = await getChatMessages(dotYouClient, conversationId, undefined, 2000);
    return allChatMessages?.searchResults?.find(
      (chat) => chat?.fileMetadata.globalTransitId === globalTransitId
    );
  };

  const chatMessages = await Promise.all(chatGlobalTransIds.map(getChatMessageByGlobalTransitId));
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
            chatMessage.fileMetadata.appData.content.deliveryDetails[key] ===
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

  if (updateSuccess.every((success) => success)) return command.id;
};

// Probably not needed, as the file is "updated" for a soft delete, which just is sent over transit to the recipients
// const deleteMessage = async (dotYouClient: DotYouClient, command: ReceivedCommand) => {
//   const deleteRequest = tryJsonParse<DeleteRequest>(command.clientJsonMessage);
//   console.log({ deleteRequest });
//   const conversationId = deleteRequest.conversationId;
//   const chatGlobalTransIds = deleteRequest.messageIds;

//   if (!conversationId || !chatGlobalTransIds) return null;

//   const getChatMessageByGlobalTransitId = async (globalTransitId: string) => {
//     const allChatMessages = await getChatMessages(dotYouClient, conversationId, undefined, 2000);
//     return allChatMessages?.searchResults?.find(
//       (chat) => chat?.fileMetadata.globalTransitId === globalTransitId
//     );
//   };

//   const chatMessages = await Promise.all(chatGlobalTransIds.map(getChatMessageByGlobalTransitId));

//   const updateSuccess = await Promise.all(
//     chatMessages.map(async (chatMessage) => {
//       if (!chatMessage) return false;

//       chatMessage.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Read;
//       try {
//         return await deleteChatMessage(dotYouClient, chatMessage.fileId);
//       } catch (ex) {
//         return false;
//       }
//     })
//   );

//   if (updateSuccess.every((success) => success)) return command.id;
// };
