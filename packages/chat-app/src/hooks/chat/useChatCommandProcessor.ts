import {
  DotYouClient,
  SecurityGroupType,
  getCommands,
  markCommandComplete,
} from '@youfoundation/js-lib/core';
import { useEffect } from 'react';
import {
  ChatDrive,
  JOIN_CONVERSATION_COMMAND,
  JoinConversationRequest,
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
  const dotYouClient = useDotYouClient().getDotYouClient();

  useEffect(() => {
    (async () => {
      const commands = await getCommands(dotYouClient, ChatDrive);

      const completedCommands = await Promise.all(
        commands.receivedCommands
          .filter(
            (command) =>
              command.clientCode === JOIN_CONVERSATION_COMMAND ||
              command.clientCode === MARK_CHAT_READ_COMMAND
          )
          .map(async (command) => {
            if (command.clientCode === JOIN_CONVERSATION_COMMAND)
              return joinConversation(dotYouClient, command);

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
    })();
  }, []);
};

const joinConversation = async (dotYouClient: DotYouClient, command: ReceivedCommand) => {
  const joinConversationRequest = tryJsonParse<JoinConversationRequest>(command.clientJsonMessage);
  try {
    await uploadConversation(dotYouClient, {
      fileMetadata: {
        appData: {
          content: {
            conversationId: joinConversationRequest.conversationId,
            title: joinConversationRequest.title,
            recipient: command.sender,
            unread: false,
            unreadCount: 0,
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

  // It's a hack... Needs to change
  const getChatMessageByGlobalTransitId = async (globalTransitId: string) => {
    const allChatMessages = await getChatMessages(dotYouClient, conversationId, undefined, 2000);
    return allChatMessages?.searchResults?.find(
      (chat) => chat?.fileMetadata.globalTransitId === globalTransitId
    );
  };

  const chatMessages = await Promise.all(chatGlobalTransIds.map(getChatMessageByGlobalTransitId));
  const updateSuccess = await Promise.all(
    chatMessages.map(async (chatMessage) => {
      if (!chatMessage) return false;

      chatMessage.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Read;
      try {
        const updateResult = await updateChatMessage(dotYouClient, chatMessage);
        return !!updateResult;
      } catch (ex) {
        return false;
      }
    })
  );

  if (updateSuccess.every((success) => success)) return command.id;
};
