import { SecurityGroupType, getCommands, markCommandComplete } from '@youfoundation/js-lib/core';
import { useEffect } from 'react';
import { ChatDrive, uploadConversation } from '../../providers/ConversationProvider';
import { useDotYouClient } from '@youfoundation/common-app';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';

const JOIN_CONVERSATION_COMMAND = 100;
interface JoinConversationRequest {
  conversationId: string;
  title: string;
}

export const useJoinConversation = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  useEffect(() => {
    (async () => {
      const commands = await getCommands(dotYouClient, ChatDrive);

      const completedCommands = await Promise.all(
        commands.receivedCommands
          .filter((command) => command.clientCode === JOIN_CONVERSATION_COMMAND)
          .map(async (command) => {
            const joinConversationRequest = tryJsonParse<JoinConversationRequest>(
              command.clientJsonMessage
            );
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
